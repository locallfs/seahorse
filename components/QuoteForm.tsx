"use client";

import { useState } from "react";

interface QuoteFormProps {
  service?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}

export default function QuoteForm({
  service = "",
  buttonLabel = "Get a Quote",
  buttonClassName = "inline-flex items-center gap-2 px-8 py-4 bg-blue-accent hover:bg-blue-light text-white font-medium rounded transition-colors duration-200 text-sm tracking-wide glow-white",
}: QuoteFormProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, service, size, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send");
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    }
    setSending(false);
  }

  function handleClose() {
    setOpen(false);
    setSent(false);
    setError("");
    setName("");
    setEmail("");
    setPhone("");
    setSize("");
    setMessage("");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-xl border border-white/10 bg-ocean-900 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {sent ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Request Sent</h3>
                <p className="text-white text-sm">
                  We'll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-1">
                  Request a Quote
                </h3>
                {service && (
                  <p className="text-white text-xs mb-6">{service}</p>
                )}
                {!service && <div className="mb-6" />}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-white mb-1">Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-ocean-800 border border-white/10 text-white text-base focus:border-blue-accent focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded bg-ocean-800 border border-white/10 text-white text-base focus:border-blue-accent focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white mb-1">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded bg-ocean-800 border border-white/10 text-white text-base focus:border-blue-accent focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-white mb-1">Tank / Pond Size</label>
                    <input
                      type="text"
                      placeholder="e.g. 150 gallon reef"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-ocean-800 border border-white/10 text-white text-base placeholder:text-white focus:border-blue-accent focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white mb-1">Message</label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded bg-ocean-800 border border-white/10 text-white text-base focus:border-blue-accent focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-4 bg-blue-accent hover:bg-blue-light text-white font-medium text-sm rounded transition-colors duration-200 disabled:opacity-50 glow-white"
                  >
                    {sending ? "Sending..." : "Submit Request"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
