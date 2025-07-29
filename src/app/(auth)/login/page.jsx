// app/login/page.js
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RiUserLine, RiLockLine, RiEyeLine, RiEyeOffLine } from "react-icons/ri";
import { showError, showSuccess, clearError } from "../../../../lib/toast";
import { useAuth } from "@/app/Authcontext/Authcontext.js";

export default function Loginpage() {
  const router = useRouter();
  const { login, user, loading, isAuthenticated } = useAuth();

  const [Email, setEmail] = useState("");
  const [Password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace("/experimenter"); // or "/admin" - make sure this matches your actual route
    }
  }, [user, loading, router]);

  const submitHandler = async (event) => {
    event.preventDefault();
    clearError();
    setIsSubmitting(true);

    if (!Email.trim() || !Password.trim()) {
      showError("Please fill in both fields.", {
        duration: Infinity,
        description: "Email and password cannot be empty.",
        action: {
          label: "X",
          onClick: () => console.log("closed"),
        },
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email, password: Password }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.message || "Login failed.", {
          duration: Infinity,
          description: "Invalid email or password. Please try again.",
          action: {
            label: "X",
            onClick: () => console.log("closed"),
          },
        });
        setIsSubmitting(false);
        return;
      }

      // Use context login (which also saves to localStorage)
      login(result.user);
      showSuccess("Login successful! Redirecting...");

      // Clear form
      setEmail("");
      setPassword("");

      setTimeout(() => {
        router.replace("/experimenter"); // or "/admin" - make sure this matches your route
      }, 1200);
      
    } catch (err) {
      console.error("Login error:", err);
      showError("Server error. Please try later.", {
        duration: Infinity,
        description: "There was an issue connecting to the server.",
        action: {
          label: "X",
          onClick: () => console.log("closed"),
        }
      });
      setIsSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't show login form if already authenticated
  if (user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="text-white">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <section className="flex justify-center items-center min-h-screen bg-gray-900 px-4">
      <form
        onSubmit={submitHandler}
        className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md"
        autoComplete="off"
      >
        <h2 className="text-white text-3xl mb-6 font-semibold text-center">
          Experimenter Login
        </h2>

        <div className="relative mb-5">
          <RiUserLine className="absolute top-3 left-3 text-gray-400" />
          <input
            type="email"
            placeholder="Email"
            value={Email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
            required
          />
        </div>

        <div className="relative mb-6">
          <RiLockLine className="absolute top-3 left-3 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={Password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="w-full py-3 pl-10 pr-12 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-3 right-3 text-gray-400 hover:text-white focus:outline-none"
            disabled={isSubmitting}
          >
            {showPassword ? <RiEyeOffLine /> : <RiEyeLine />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 disabled:cursor-not-allowed text-black py-3 rounded-md font-semibold transition"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </button>
        
        <p className="text-center text-gray-300 mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="text-yellow-400 hover:underline cursor-pointer">
            Sign up
          </a>
        </p>
      </form>
    </section>
  );
}