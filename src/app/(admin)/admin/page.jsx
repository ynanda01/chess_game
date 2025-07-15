"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiUser, FiLogOut, FiPlus, FiEdit, FiSettings, FiTrash } from "react-icons/fi";
import "./page.css";

export default function AdminDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Experimenter");
  const [experiments, setExperiments] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUserName(storedUser.name || "Experimenter");

    const storedExperiments = JSON.parse(localStorage.getItem("experiments") || "[]");
    setExperiments(storedExperiments);
  }, []);

  const handleCreate = () => router.push("/admin/create-experiment");

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleDelete = (id) => {
    const experiment = experiments.find((exp) => exp.id === id);
    if (!experiment) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the experiment "${experiment.name}"?\n\nPlease export your data before deleting. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    const updated = experiments.filter((exp) => exp.id !== id);
    setExperiments(updated);
    localStorage.setItem("experiments", JSON.stringify(updated));
  };

  const handleExport = (id) => {
    const experiment = experiments.find((exp) => exp.id === id);
    if (!experiment) return;

    const headers = [
      "Experiment Name",
      "Player Name",
      "Puzzle",
      "Correct",
      "Advice Shown",
      "Advice Taken",
      "Time Taken (s)"
    ];

    const rows = (experiment.sessions || [])
      .flatMap(session =>
        (session.attempts || []).map(attempt => [
          experiment.name,
          session.playerName,
          attempt.puzzleName,
          attempt.correct ? "Yes" : "No",
          attempt.adviceShown ? "Yes" : "No",
          attempt.adviceTaken ? "Yes" : "No",
          attempt.timeTaken || ""
        ])
      );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${experiment.name.replace(/\s+/g, "_")}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/logo.png" alt="Logo" className="navbar-logo" />
        </div>

        <div className="navbar-title">Welcome, {userName}</div>

        <div className="navbar-actions">
          <button onClick={() => router.push("/admin/profile")} className="icon-btn">
            <FiUser /> Profile
          </button>
          <button onClick={handleLogout} className="icon-btn logout">
            <FiLogOut /> Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="create-wrapper">
          <button onClick={handleCreate} className="create-btn">
            <FiPlus /> Create New Experiment
          </button>
        </div>

        <h2 className="section-title">Recent Experiments</h2>

        {experiments.length === 0 ? (
          <p className="no-exp">No experiments created yet.</p>
        ) : (
          <ul className="experiment-list">
            {experiments.map((exp) => (
              <li key={exp.id} className="experiment-item">
                <span>{exp.name}</span>
                <div className="experiment-actions">
                  <button onClick={() => router.push(`/admin/edit/${exp.id}`)} className="action-btn edit">
                    <FiEdit /> Edit
                  </button>
                  <button onClick={() => router.push(`/admin/manage/${exp.id}`)} className="action-btn manage">
                    <FiSettings /> Manage
                  </button>
                  <button onClick={() => handleExport(exp.id)} className="action-btn export">
                    <FiPlus /> Export
                  </button>
                  <button onClick={() => handleDelete(exp.id)} className="action-btn delete">
                    <FiTrash /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
