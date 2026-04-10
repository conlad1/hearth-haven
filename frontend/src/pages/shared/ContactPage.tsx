import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Mail, CheckCircle } from "lucide-react";

function ContactPage() {
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const web3FormsAccessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY ?? "";

  useEffect(() => {
    if (!isSuccessModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSuccessModalOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSuccessModalOpen]);

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (!web3FormsAccessKey) {
      setStatusMessage("The contact form is not configured. Add VITE_WEB3FORMS_ACCESS_KEY to the frontend environment.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Sending your message...");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok) {
        setStatusMessage("");
        setSuccessModalMessage(result.message || "Message sent. We will get back to you soon.");
        setIsSuccessModalOpen(true);
        form.reset();
      } else {
        setStatusMessage(result.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatusMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-14">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
            <Mail className="h-6 w-6 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold">Contact Us</h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Send us a message and our team will respond as soon as possible.</p>
        </div>

        <div className="card">
          <form onSubmit={handleContactSubmit} className="space-y-5">
            <input type="hidden" name="access_key" value={web3FormsAccessKey} />
            <input type="hidden" name="from_name" value="The Hearth Project" />
            <input type="hidden" name="subject" value="New contact form submission from The Hearth Project" />
            <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} aria-hidden="true" />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
                <input type="text" name="name" placeholder="Your name" required className="input-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                <input type="email" name="email" placeholder="you@example.com" required className="input-field" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</span>
              <input type="text" name="user_subject" placeholder="How can we help?" required className="input-field" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Message</span>
              <textarea name="message" placeholder="Tell us what you need..." rows={6} required className="input-field resize-none" />
            </label>

            {statusMessage && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{statusMessage}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>

      {isSuccessModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsSuccessModalOpen(false)}>
          <div className="modal-body max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Message Sent</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{successModalMessage}</p>
            <button className="btn-primary mt-6 w-full" onClick={() => setIsSuccessModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactPage;
