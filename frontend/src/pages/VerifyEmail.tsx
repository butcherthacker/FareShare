import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, MailWarning, RefreshCcw, MailPlus } from "lucide-react";

import { apiPost, ApiClientError } from "../utils/api";
import { useAuth } from "../hooks/useAuth";
import Background from "../components/Background";

type VerificationStatus = "idle" | "verifying" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState("Click the button below to verify your email address.");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token. Please use the link from your email.");
    }

    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, [token]);

  const handleVerify = async () => {
    if (!token) {
      setMessage("Missing verification token. Please use the link from your email.");
      setStatus("error");
      return;
    }

    setStatus("verifying");
    setMessage("Verifying your email...");

    try {
      const endpoint = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      await apiPost(endpoint);
      setStatus("success");
      setMessage("Your email has been verified! Redirecting to login...");
      redirectTimeout.current = setTimeout(() => {
        navigate("/signin", { replace: true });
      }, 2500);
    } catch (error) {
      let detail = "Failed to verify your email. Please try again.";
      if (error instanceof ApiClientError) {
        detail = error.detail;
      }
      setStatus("error");
      setMessage(detail);
    }
  };

  const handleResend = async () => {
    setResendMessage(null);

    setResendLoading(true);
    try {
      if (isAuthenticated) {
        await apiPost("/api/auth/resend-verification");
        setResendMessage("Verification email sent! Please check your inbox.");
      } else {
        if (!resendEmail.trim()) {
          setResendMessage("Enter the email you registered with so we can resend the link.");
          return;
        }
        await apiPost("/api/auth/resend-verification-email", {
          email: resendEmail.trim(),
        });
        setResendMessage("If that email exists, we've sent a new verification link.");
      }
    } catch (error) {
      const detail = error instanceof ApiClientError
        ? error.detail
        : "Unable to resend verification email.";
      setResendMessage(detail);
    } finally {
      setResendLoading(false);
    }
  };

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div
      className="flex items-center justify-center px-4"
      style={{ height: "calc(100vh - 80px)" }}
    >
      <Background />
      <motion.div
        className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center"
        style={{ border: "1px solid var(--color-secondary)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isSuccess ? (
          <CheckCircle size={64} className="mx-auto mb-4" style={{ color: "var(--color-accent)" }} />
        ) : (
          <MailWarning size={64} className="mx-auto mb-4" style={{ color: "var(--color-primary)" }} />
        )}

        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--color-primary)" }}>
          {isSuccess ? "Email Verified" : status === "verifying" ? "Verifying Email" : "Verification Needed"}
        </h1>

        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>

        {status === "verifying" && (
          <p className="text-sm text-gray-500">This may take a moment...</p>
        )}

        {status !== "success" && (
          <motion.button
            type="button"
            onClick={handleVerify}
            disabled={status === "verifying"}
            className="mt-4 px-6 py-2 rounded-lg text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-primary)" }}
            whileHover={{ scale: status === "verifying" ? 1 : 1.02 }}
            whileTap={{ scale: status === "verifying" ? 1 : 0.98 }}
          >
            {status === "verifying" ? "Verifying..." : "Verify Email"}
          </motion.button>
        )}

        {isSuccess && (
          <motion.button
            type="button"
            className="mt-4 px-6 py-2 rounded-lg text-white font-semibold"
            style={{ backgroundColor: "var(--color-primary)" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/signin")}
          >
            Go to Login Now
          </motion.button>
        )}

        {isError && (
          <div className="mt-6 space-y-3">
            {!isAuthenticated && (
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Enter your registration email"
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: "var(--color-secondary)" }}
              />
            )}
            <motion.button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--color-primary)" }}
              whileHover={{ scale: resendLoading ? 1 : 1.02 }}
              whileTap={{ scale: resendLoading ? 1 : 0.98 }}
            >
              {resendLoading ? (
                <>
                  <RefreshCcw className="animate-spin" size={18} />
                  Resending...
                </>
              ) : (
                <>
                  <MailPlus size={18} />
                  Resend Verification Email
                </>
              )}
            </motion.button>

            <p className="text-sm text-gray-500">
              {isAuthenticated
                ? "We will send the link to the email on your account."
                : "Enter your email above so we can send you a fresh verification link."}
            </p>

            {resendMessage && (
              <div
                className="text-sm px-3 py-2 rounded"
                style={{
                  backgroundColor: "rgba(var(--color-primary-rgb), 0.08)",
                  color: "var(--color-primary)",
                }}
              >
                {resendMessage}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
