import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RegistrationPage from "@/features/candidate/registration/RegistrationPage";
import InstructionsPage from "@/features/candidate/assessment/InstructionsPage";
import TestPage from "@/features/candidate/assessment/TestPage";
import ResultPage from "@/features/candidate/assessment/ResultPage";
import AdminLoginPage from "@/features/admin/AdminLoginPage";
import { AdminRoute } from "@/features/admin/AdminRoute";
import AdminLayout from "@/features/admin/AdminLayout";
const AdminDashboardPage = lazy(() => import("@/features/admin/AdminDashboardPage"));
const QuestionManagementPage = lazy(() => import("@/features/admin/QuestionManagementPage"));
const CandidateListPage = lazy(() => import("@/features/admin/CandidateListPage"));
const CandidateDetailPage = lazy(() => import("@/features/admin/CandidateDetailPage"));
const AssessmentSettingsPage = lazy(() => import("@/features/admin/AssessmentSettingsPage"));
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegistrationPage />} />
        <Route
          path="/assessment/:candidateId/instructions"
          element={<InstructionsPage />}
        />
        <Route path="/assessment/:candidateId/test" element={<TestPage />} />
        <Route path="/assessment/:candidateId/result" element={<ResultPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="questions" element={<QuestionManagementPage />} />
          <Route path="settings" element={<AssessmentSettingsPage />} />
          <Route path="candidates" element={<CandidateListPage />} />
          <Route path="candidates/:candidateId" element={<CandidateDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
