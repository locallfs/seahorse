export async function POST(req: any, res: any) {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: "No file uploaded" })
      return
    }

    const raw = file.buffer.toString("utf-8")
    const lines = raw.split("\n").filter((l: string) => l.trim())
    if (lines.length < 2) {
      res.status(400).json({ error: "CSV must have a header row and at least one data row" })
      return
    }

    const headerLine = lines[0]
    const delimiter = headerLine.includes("\t") ? "\t" : ","
    const headers = parseCSVRow(headerLine, delimiter).map((h: string) => h.trim().toLowerCase())

    const titleIdx = headers.findIndex((h: string) => h === "product title")
    if (titleIdx === -1) {
      res.status(400).json({ error: "CSV must have a 'Product Title' column" })
      return
    }

    const hasHandle = headers.includes("product handle")
    const hasVariantTitle = headers.includes("variant title")
    const hasOptionName = headers.some((h: string) => /variant option \d+ name/.test(h))
    const hasOptionValue = headers.some((h: string) => /variant option \d+ value/.test(h))
    const hasStatus = headers.includes("product status")

    const originalHeaders = parseCSVRow(headerLine, delimiter).map((h: string) => h.trim())

    const newHeaders = [...originalHeaders]
    if (!hasHandle) newHeaders.push("Product Handle")
    if (!hasVariantTitle) newHeaders.push("Variant Title")
    if (!hasOptionName) newHeaders.push("Variant Option 1 Name")
    if (!hasOptionValue) newHeaders.push("Variant Option 1 Value")
    if (!hasStatus) newHeaders.push("Product Status")

    const outputLines = [newHeaders.join(delimiter)]

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVRow(line, delimiter)
      const title = values[titleIdx]?.trim() || ""
      if (!title) continue

      const newValues = [...values]

      while (newValues.length < originalHeaders.length) {
        newValues.push("")
      }

      if (!hasHandle) {
        newValues.push(slugify(title))
      } else {
        const handleIdx = headers.indexOf("product handle")
        if (!newValues[handleIdx]?.trim()) {
          newValues[handleIdx] = slugify(title)
        } else {
          newValues[handleIdx] = slugify(newValues[handleIdx].trim())
        }
      }

      if (!hasVariantTitle) newValues.push("Default")
      if (!hasOptionName) newValues.push("Size")
      if (!hasOptionValue) newValues.push("One Size")
      if (!hasStatus) newValues.push("draft")

      outputLines.push(newValues.map((v: string) => escapeCSV(v, delimiter)).join(delimiter))
    }

    const processedCSV = outputLines.join("\n")

    console.log("Smart import: processed CSV headers:", newHeaders.join(", "))
    console.log("Smart import: total data rows:", outputLines.length - 1)
    console.log("Smart import: first data row sample:", outputLines[1]?.substring(0, 200))

    const { importProductsWorkflow } = require("@medusajs/core-flows")
    const { result, transaction } = await importProductsWorkflow(req.scope).run({
      input: {
        filename: file.originalname || "import.csv",
        fileContent: processedCSV,
      },
    })

    res.status(202).json({
      transaction_id: transaction.transactionId,
      summary: result,
      message: "Import started. You will be notified when it completes.",
    })
  } catch (error: any) {
    console.log("Smart import error:", error.message)
    res.status(500).json({ error: error.message })
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
}

function parseCSVRow(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ""
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function escapeCSV(value: string, delimiter: string): string {
  if (!value) return ""
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
