"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import {
  optionalSanitizedString,
  sanitizedEmail,
  sanitizedString,
} from "@/lib/validation/schemas";
import { z } from "zod";

const adminManagedRoles = [
  "STUDENT",
  "SUPERVISOR",
  "EXAMINER",
  "ADMINISTRATOR",
] as const;

type AdminManagedRole = (typeof adminManagedRoles)[number];

type AdminUserListItem = {
  id: string;
  email: string;
  displayName: string;
  role: AdminManagedRole;
  isActive: boolean;
  firebaseUid: string | null;
  createdAt: string;
  department: string | null;
  specialization: string | null;
  programType?: string | null;
};

const createUserSchema = z.object({
  email: sanitizedEmail,
  displayName: sanitizedString.min(1, "Display name is required."),
  role: z.enum(adminManagedRoles),
  department: optionalSanitizedString,
  specialization: optionalSanitizedString,
  programType: optionalSanitizedString,
});

async function getAuthorizationHeader() {
  const currentUser = getFirebaseClientAuth().currentUser;

  if (!currentUser) {
    throw new Error("You must be signed in to manage users.");
  }

  const token = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<"ALL" | AdminManagedRole>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    email: "",
    displayName: "",
    role: "STUDENT" as AdminManagedRole,
    department: "",
    specialization: "",
    programType: "MPHIL",
  });

  async function loadUsers(roleFilter: "ALL" | AdminManagedRole) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const headers = await getAuthorizationHeader();
      const query =
        roleFilter === "ALL" ? "" : `?role=${encodeURIComponent(roleFilter)}`;
      const response = await fetch(`/api/admin/users${query}`, {
        headers,
      });
      const payload = (await response.json()) as {
        users?: AdminUserListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load users.");
      }

      setUsers(payload.users ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load users.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers(selectedRole);
  }, [selectedRole]);

  const visibleRoleHint = useMemo(() => {
    return selectedRole === "ALL"
      ? "Showing all administrator-managed accounts."
      : `Showing ${selectedRole.toLowerCase()} accounts only.`;
  }, [selectedRole]);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = createUserSchema.safeParse(formValues);

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid form values.");
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = await getAuthorizationHeader();
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create the user.");
      }

      setSuccessMessage("User account created. A welcome email has been queued.");
      setIsModalOpen(false);
      setFormValues({
        email: "",
        displayName: "",
        role: "STUDENT",
        department: "",
        specialization: "",
        programType: "MPHIL",
      });
      await loadUsers(selectedRole);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create the user.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(userId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const headers = await getAuthorizationHeader();
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: "PATCH",
        headers,
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to deactivate the user.");
      }

      setSuccessMessage("User account deactivated.");
      await loadUsers(selectedRole);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to deactivate the user.",
      );
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white/70 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black">
            Administrator User Management
          </p>
          <h1 className="text-3xl font-semibold text-white">Manage system accounts</h1>
          <p className="max-w-2xl text-sm text-black">
            Create and deactivate students, supervisors, examiners, and administrators.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            value={selectedRole}
            onChange={(event) =>
              setSelectedRole(event.target.value as "ALL" | AdminManagedRole)
            }
            className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-black outline-none focus:border-gray-300"
          >
            <option value="ALL">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="SUPERVISOR">Supervisors</option>
            <option value="EXAMINER">Examiners</option>
            <option value="ADMINISTRATOR">Administrators</option>
          </select>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-black transition hover:bg-black"
          >
            Create New User
          </button>
        </div>
      </div>

      <p className="text-sm text-black">{visibleRoleHint}</p>

      {errorMessage ? (
        <div className="rounded-2xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-black">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-black">
          {successMessage}
        </div>
      ) : null}

      <div className="hidden overflow-hidden rounded-3xl border border-gray-200 bg-white/70 md:block">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-gray-50/80 text-black">
            <tr>
              <th className="px-5 py-4 text-left font-medium">Name</th>
              <th className="px-5 py-4 text-left font-medium">Role</th>
              <th className="px-5 py-4 text-left font-medium">Details (Dept / Program)</th>
              <th className="px-5 py-4 text-left font-medium">Status</th>
              <th className="px-5 py-4 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-black">
            {isLoading ? (
              <tr>
                <td className="px-5 py-6 text-black" colSpan={5}>
                  Loading accounts...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-black" colSpan={5}>
                  No administrator-managed users found for this filter.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{user.displayName}</div>
                    <div className="text-black">{user.email}</div>
                  </td>
                  <td className="px-5 py-4">{user.role}</td>
                  <td className="px-5 py-4">
                    {user.role === "STUDENT" ? (
                      <div>{user.programType ?? "Not set"} Program</div>
                    ) : (
                      <>
                        <div>{user.department ?? "Not set"}</div>
                        {user.specialization ? (
                          <div className="text-black">{user.specialization}</div>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        user.isActive
                          ? "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-black"
                          : "rounded-full bg-gray-200/70 px-3 py-1 text-xs font-medium text-black"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      disabled={!user.isActive}
                      onClick={() => void handleDeactivate(user.id)}
                      className="rounded-2xl border border-gray-300 px-3 py-2 text-xs font-semibold text-black transition hover:border-gray-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {isLoading ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white/70 p-4 text-sm text-black">
            Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white/70 p-4 text-sm text-black">
            No administrator-managed users found for this filter.
          </div>
        ) : (
          users.map((user) => (
            <article
              key={user.id}
              className="rounded-[1.75rem] border border-gray-200 bg-white/70 p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-white">
                    {user.displayName}
                  </p>
                  <p className="mt-1 break-all text-sm text-black">
                    {user.email}
                  </p>
                </div>
                <span className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black">
                  {user.role}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-black">
                <p>
                  <span className="text-black0">Details:</span>{" "}
                  {user.role === "STUDENT"
                    ? `${user.programType ?? "Not set"} Program`
                    : user.department ?? "Not set"}
                </p>
                {user.specialization ? (
                  <p>
                    <span className="text-black0">Specialization:</span>{" "}
                    {user.specialization}
                  </p>
                ) : null}
                <p>
                  <span className="text-black0">Status:</span>{" "}
                  <span
                    className={
                      user.isActive
                        ? "text-black"
                        : "text-black"
                    }
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={!user.isActive}
                onClick={() => void handleDeactivate(user.id)}
                className="mt-4 w-full rounded-2xl border border-gray-300 px-3 py-3 text-sm font-semibold text-black transition hover:border-gray-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Deactivate
              </button>
            </article>
          ))
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/75 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl shadow-slate-950/60">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Create New User</h2>
                <p className="mt-2 text-sm text-black">
                  Select the role and fill out the details appropriately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-gray-300 px-3 py-1 text-sm text-black"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateUser}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-black">
                  <span>Email</span>
                  <input
                    value={formValues.email}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none focus:border-gray-300"
                    placeholder="name@eng.pdn.ac.lk"
                  />
                </label>

                <label className="space-y-2 text-sm text-black">
                  <span>Display name</span>
                  <input
                    value={formValues.displayName}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none focus:border-gray-300"
                    placeholder="Dr. Jane Perera"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-black">
                  <span>Role</span>
                  <select
                    value={formValues.role}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        role: event.target.value as AdminManagedRole,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none focus:border-gray-300"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="EXAMINER">Examiner</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                  </select>
                </label>

                {formValues.role === "STUDENT" ? (
                  <label className="space-y-2 text-sm text-black">
                    <span>Program Type</span>
                    <select
                      value={formValues.programType}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          programType: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none focus:border-gray-300"
                    >
                      <option value="MPHIL">MPhil</option>
                      <option value="PHD">PhD</option>
                      <option value="MSC">MSc</option>
                      <option value="MENG">MEng</option>
                    </select>
                  </label>
                ) : (
                  <label className="space-y-2 text-sm text-black">
                    <span>Department</span>
                    <input
                      value={formValues.department}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          department: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none focus:border-gray-300"
                      placeholder="Computer Engineering"
                    />
                  </label>
                )}
              </div>

              {formValues.role !== "STUDENT" && formValues.role !== "ADMINISTRATOR" ? (
                <label className="space-y-2 text-sm text-black">
                  <span>Specialization</span>
                  <input
                    value={formValues.specialization}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        specialization: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-black outline-none focus:border-gray-300"
                    placeholder="Distributed Systems"
                  />
                </label>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-black transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Creating..." : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
