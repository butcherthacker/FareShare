import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ApiClientError } from "../utils/api";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import Background from "../components/Background";

export default function SignUp() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!fullName.trim()) return "Full name is required";
    if (fullName.trim().length < 2) return "Full name must be at least 2 characters";
    if (!email.trim()) return "Email is required";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return "Enter a valid email address";
    if (password.length < 8) return "Password must be at least 8 characters";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientError = validate();
    if (clientError) {
      setErrors(clientError);
      return;
    }

    setSubmitting(true);
    setErrors(null);

    try {
      // Register user using auth context
      await register({
        full_name: fullName,
        email: email,
        password: password,
      });
      
      // Navigate to success page
      navigate("/signup/success", { replace: true });
    } catch (error) {
      // Handle API errors
      if (error instanceof ApiClientError) {
        setErrors(error.detail);
      } else {
        setErrors("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6 flex flex-col items-center justify-center overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <Background />
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <Link 
            to="/signin" 
            className="text-sm font-medium transition-colors flex items-center gap-1" 
            style={{ color: '#4a5568' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'} 
            onMouseLeave={(e) => e.currentTarget.style.color = '#4a5568'}
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>Registration</h2>
          <div style={{ width: '60px' }}></div>
        </div>

        {errors && (
          <motion.div 
            className="mb-4 p-3 text-sm text-white rounded-lg flex items-center gap-2" 
            style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.9)' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <AlertCircle size={18} />
            {errors}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl shadow-[0_10px_30px_rgba(252,74,26,0.12)] p-6">
          <div>
            <label className="text-sm font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <User size={16} />
              Full Name
            </label>
            <input 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="John Doe" 
              className="mt-1 block w-full border-b-2 py-2 px-1 outline-none transition-colors" 
              style={{ borderBottomColor: 'var(--color-secondary)' }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-primary)'} 
              onBlur={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-secondary)'} 
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <Mail size={16} />
              Email Address
            </label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              type="email" 
              placeholder="john@example.com" 
              className="mt-1 block w-full border-b-2 py-2 px-1 outline-none transition-colors" 
              style={{ borderBottomColor: 'var(--color-secondary)' }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-primary)'} 
              onBlur={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-secondary)'} 
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <Lock size={16} />
              Password
            </label>
            <div className="relative">
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type={showPassword ? "text" : "password"} 
                placeholder="Minimum 8 characters" 
                className="mt-1 block w-full border-b-2 py-2 px-1 outline-none pr-16 transition-colors" 
                style={{ borderBottomColor: 'var(--color-secondary)' }}
                onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-primary)'} 
                onBlur={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-secondary)'} 
              />
              <motion.button 
                type="button" 
                onClick={() => setShowPassword((s) => !s)} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium flex items-center gap-1" 
                style={{ color: 'var(--color-accent)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </motion.button>
            </div>
          </div>

          <div className="pt-2">
            <motion.button 
              type="submit" 
              disabled={submitting} 
              className="w-full text-white rounded-lg py-3 font-semibold shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5" 
              style={{ backgroundColor: submitting ? undefined : 'var(--color-primary)' }}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
            >
              {submitting ? "Submitting..." : "Submit"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
