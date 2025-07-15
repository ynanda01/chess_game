"use client";
import React, { useState } from "react";
import {

  MdPersonOutline,
  MdEmail,
  MdLockOutline,
  MdVisibility,
  MdVisibilityOff,
  MdErrorOutline,
  MdCheckCircleOutline,

} from "react-icons/md";
import { useRouter } from "next/navigation";
import { showError, showSuccess, clearError } from "../../../../lib/toast";


export default function SignupPage() {
  const router = useRouter();

  const [inputs, setInputs] = useState({
    first: "",
    last: "",
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
    const { first, last, email, password, confirmPassword } = inputs;
    if (!first || !last || !email || !password || !confirmPassword) {
      showError("All fields are required.",{
        duration: Infinity,
        description: "Please fill in all fields before submitting.",
        action: {
          label: "X",
          onClick: () => console.log("closed"),}
      }

      );
      return false;
    }
    if (password !== confirmPassword) {
      showError("Passwords do not match.",{
        duration: Infinity,
        description: "Please ensure both password fields match.",
        action: {
          label: "X",
          onClick: () => console.log("closed"),}
      }

      );
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
        body: JSON.stringify(inputs),
      });

      const data = await res.json();

      if (!res.ok) {
        showError("Signup failed.",{
          duration: Infinity,
          description: data.message || "Please check your inputs and try again.",
          action: {
            label: "X",
            onClick: () => console.log("closed"),
          },
        }

        );
        setIsLoading(false);
        return;
      }

      showSuccess("Account created successfully! Automatically redirecting to the login page...");
      setInputs({
        first: "",
        last: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      showError("Server error. Try again later.");
    }
    setIsLoading(false);
  };

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
              name="first"
              type="text"
              placeholder="First Name"
              value={inputs.first}
              onChange={handleChange}
              className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1 "
              required
            />
          </div>
          <div className="relative w-full sm:w-1/2">
            <MdPersonOutline className="absolute top-3 left-3 text-gray-400" />
            <input
              name="last"
              type="text"
              placeholder="Last Name"
              value={inputs.last}
              onChange={handleChange}
              className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1"
              required
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
            className="w-full py-3 pl-10 pr-4 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1"
          />
        </div>

        <div className="relative">
          <MdLockOutline className="absolute top-3 left-3 text-gray-400" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={inputs.password}
            onChange={handleChange}
            className="w-full py-3 pl-10 pr-10 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1"
            required
          />
          <button
            type="button"
            onClick={togglePassword}
            className="absolute top-3 right-3 text-gray-400 p-1 hover:text-yellow-500 transition cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>

        <div className="relative">
          <MdLockOutline className="absolute top-3 left-3 text-gray-400" />
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={inputs.confirmPassword}
            onChange={handleChange}
            className="w-full py-3 pl-10 pr-10 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1"
            required
          />
          <button
            type="button"
            onClick={toggleConfirmPassword}
            className="absolute top-3 right-3 text-gray-400 p-1 hover:text-yellow-500 transition cursor-pointer"
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>


        <button
          type="submit"
          
          disabled={isLoading}
          className={`w-full bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded-md font-semibold transition transform duration-150 ${
            isLoading ? "cursor-not-allowed opacity-70" : "active:scale-95"
          }`}
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
        <p className="text-center text-gray-300 mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-yellow-400 hover:underline cursor-pointer">
              Login here
            </a>
        </p>
      </form>
    </section>
  );
}
