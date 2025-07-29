"use client";
import React, { useState } from "react";
import {
  MdPersonOutline,
  MdEmail,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import { useRouter } from "next/navigation";
import { showError, showSuccess, clearError } from "../../../../lib/toast";

export default function SignupPage() {
  const router = useRouter();

  const [inputs, setInputs] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    clearError();
  };

  const togglePassword = () => setShowPassword((prev) => !prev);
  const toggleConfirmPassword = () => setShowConfirmPassword((prev) => !prev);

  const validateInputs = () => {
    const { firstName, lastName, email, password, confirmPassword } = inputs;
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      showError("All fields are required.", {
        duration: Infinity,
        description: "Please fill in all fields before submitting.",
        action: { label: "X", onClick: () => {} },
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showError("Invalid email format.", {
        duration: Infinity,
        description: "Please enter a valid email address.",
        action: { label: "X", onClick: () => {} },
      });
      return false;
    }

    if (password.length < 6) {
      showError("Password too short.", {
        duration: Infinity,
        description: "Password must be at least 6 characters long.",
        action: { label: "X", onClick: () => {} },
      });
      return false;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match.", {
        duration: Infinity,
        description: "Please ensure both password fields match.",
        action: { label: "X", onClick: () => {} },
      });
      return false;
    }

    return true;
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: inputs.firstName.trim(),
          lastName: inputs.lastName.trim(),
          email: inputs.email.trim().toLowerCase(),
          password: inputs.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = "Signup failed.";
        let errorDescription = "Please check your inputs and try again.";

        if (res.status === 409) {
          errorMessage = "Email already exists.";
          errorDescription = "An account with this email already exists. Try logging in instead.";
        } else if (res.status === 400) {
          errorMessage = "Invalid input.";
          errorDescription = data.error || "Please check your inputs and try again.";
        }

        showError(errorMessage, {
          duration: Infinity,
          description: errorDescription,
          action: { label: "X", onClick: () => {} },
        });
        return;
      }

      showSuccess("Account created successfully! Redirecting to login...", {
        duration: 3000,
        description: "Welcome! You can now log in with your new account.",
      });

      setInputs({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => router.push("/login"), 2000);

    } catch (err) {
      console.error("Signup error:", err);
      showError("Network error.", {
        duration: Infinity,
        description: "Unable to connect to server. Please try again.",
        action: { label: "X", onClick: () => {} },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return null;
    if (password.length < 6) return { strength: "weak", color: "text-red-400" };
    if (password.length < 8) return { strength: "fair", color: "text-yellow-400" };
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: "strong", color: "text-green-400" };
    }
    return { strength: "good", color: "text-blue-400" };
  };

  const passwordStrength = getPasswordStrength(inputs.password);

  return (
    <section className="flex justify-center items-center min-h-screen bg-gray-900 px-4">
      <form
        onSubmit={submitHandler}
        className="bg-gray-800 bg-opacity-90 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full max-w-lg space-y-5"
        autoComplete="off"
      >
        <h2 className="text-white text-3xl mb-6 font-semibold text-center">
          Create Experimenter Account
        </h2>

        <p className="text-yellow-400 font-medium text-sm text-center -mt-4 mb-2">
          All fields are mandatory*
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-1/2">
            <MdPersonOutline className="absolute top-3 left-3 text-gray-400" />
            <input
              name="firstName"
              type="text"
              placeholder="First Name"
              value={inputs.firstName}
              onChange={handleChange}
              className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
              required
              disabled={isLoading}
            />
          </div>
          <div className="relative w-full sm:w-1/2">
            <MdPersonOutline className="absolute top-3 left-3 text-gray-400" />
            <input
              name="lastName"
              type="text"
              placeholder="Last Name"
              value={inputs.lastName}
              onChange={handleChange}
              className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="relative">
          <MdEmail className="absolute top-3 left-3 text-gray-400" />
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={inputs.email}
            onChange={handleChange}
            className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            required
            disabled={isLoading}
          />
        </div>

        <div className="relative">
          <MdLockOutline className="absolute top-3 left-3 text-gray-400" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 6 characters)"
            value={inputs.password}
            onChange={handleChange}
            className="w-full py-3 pl-10 pr-10 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={togglePassword}
            className="absolute top-3 right-3 text-gray-400 p-1 hover:text-yellow-500 transition cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={isLoading}
          >
            {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
          {passwordStrength && (
            <div className="mt-1 text-xs">
              <span className={`${passwordStrength.color} font-medium`}>
                Password strength: {passwordStrength.strength}
              </span>
            </div>
          )}
        </div>

        <div className="relative">
          <MdLockOutline className="absolute top-3 left-3 text-gray-400" />
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={inputs.confirmPassword}
            onChange={handleChange}
            className="w-full py-3 pl-10 pr-10 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={toggleConfirmPassword}
            className="absolute top-3 right-3 text-gray-400 p-1 hover:text-yellow-500 transition cursor-pointer"
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            disabled={isLoading}
          >
            {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
          {inputs.confirmPassword && (
            <div className="mt-1 text-xs">
              {inputs.password === inputs.confirmPassword ? (
                <span className="text-green-400 font-medium">✓ Passwords match</span>
              ) : (
                <span className="text-red-400 font-medium">✗ Passwords don't match</span>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-md font-semibold transition-all transform duration-150 ${
            isLoading 
              ? "cursor-not-allowed opacity-70" 
              : "hover:shadow-lg active:scale-95"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
              <span>Creating Account...</span>
            </div>
          ) : (
            "Create Account"
          )}
        </button>

        <p className="text-center text-gray-300 mt-4">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-yellow-400 hover:underline cursor-pointer transition-colors"
            disabled={isLoading}
          >
            Login here
          </button>
        </p>
      </form>
    </section>
  );
}