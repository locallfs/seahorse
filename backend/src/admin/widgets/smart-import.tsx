import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState, useRef } from "react"

declare const __BACKEND_URL__: string | undefined

const SmartImportWidget = () => {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const backendUrl = __BACKEND_URL__ ?? ""

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error("Select a CSV file first")
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${backendUrl}/admin/smart-import`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const data = await res.json() as { message?: string; summary?: { toCreate?: number }; error?: string }

      if (!res.ok) {
        toast.error(data.error || "Import failed")
        setResult(`Error: ${data.error}`)
        return
      }

      toast.success("Import started!")
      setResult(`${data.summary?.toCreate || 0} products queued for import. Check Workflows for progress.`)

      if (fileRef.current) fileRef.current.value = ""
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Container className="p-4">
      <Heading level="h2" className="mb-2">Smart Import</Heading>
      <Text size="small" className="text-ui-fg-muted mb-3">
        Upload your CSV with just Product Title and price columns. Handles, variants, and options are auto-generated.
      </Text>
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="text-sm text-ui-fg-base file:mr-3 file:rounded file:border-0 file:bg-ui-bg-base-pressed file:px-3 file:py-1.5 file:text-sm file:text-ui-fg-base"
        />
        <Button
          size="small"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? "Importing..." : "Import"}
        </Button>
      </div>
      {result && (
        <Text size="small" className="mt-3 text-ui-fg-subtle">{result}</Text>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default SmartImportWidget
