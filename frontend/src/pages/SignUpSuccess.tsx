import { Link } from "react-router-dom";
import Background from "../components/Background";

export default function SignUpSuccess() {
  return (
    <div className="flex items-center justify-center bg-white px-6 overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <Background />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-[0_10px_30px_rgba(2,6,23,0.08)] p-8 text-center">
          <img src="/FareShare_Logo.png" alt="FareShare" className="h-24 md:h-28 mx-auto mb-6" />
          <div className="bg-gray-50 rounded-lg p-8 mb-6">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-xl font-bold mb-3 text-slate-900">Thank you for registering with FareShare!</h2>
            <p className="text-base text-gray-700 leading-relaxed">You should receive an email to verify your account registration shortly.</p>
          </div>

          <div>
            <Link to="/signin" className="inline-block w-full bg-orange-500 text-white rounded-lg py-3 font-semibold shadow-md hover:bg-orange-600 active:bg-orange-700 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
