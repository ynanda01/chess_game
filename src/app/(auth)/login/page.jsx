"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RiUserLine, RiLockLine } from "react-icons/ri";
import { showError, showSuccess, clearError } from "../../../../lib/toast";

export default function Loginpage() {
  const router = useRouter();

  const [Email, setEmail] = useState("");
  const [Password, setPassword] = useState("");
  

  const submitHandler = async (event) => {
    event.preventDefault();
    clearError();

    if (!Email.trim() || !Password.trim()) {
      showError("Please fill in both fields.",{
        duration: Infinity,
        description: "Email and password cannot be empty.",
        action: {
          label: "X",
          onClick: () =>console .log("closed"),
          },
      });
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
        showError(result.message || "Login failed.",{
          duration: Infinity,
          description: "Invalid email or passowrd, Please try again.",
          action: {
            label: "X",
            onClick: () => console.log("closed"),
          },
          });

        return;
      }

      localStorage.setItem("user", JSON.stringify(result.user));
      showSuccess("Login successful! Redirecting...");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err) {
      showError("Server error. Please try later.",{
        duration: Infinity,
        description: "There was an issue connecting to the server.",
        action: {
          label: "X",
          onClick: () => console.log("closed"),}
      }

      );
    }
  };

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
            type="text"
            placeholder="Email"
            value={Email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        <div className="relative mb-6">
          <RiLockLine className="absolute top-3 left-3 text-gray-400" />
          <input
            type="password"
            placeholder="Password"
            value={Password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>

        {Error.error && (
          <p className="mb-4 text-red-500 font-medium">{Error.error}</p>
        )}
        {Error.success && (
          <p className="mb-4 text-green-400 font-medium">{Error.success}</p>
        )}

        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-md font-semibold transition"
        >
          Log In
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
