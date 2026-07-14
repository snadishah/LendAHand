import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiPatch, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Avatar } from "../components/ui/Avatar";

export function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const emailsOn = !(user?.emailOptOut ?? false);
  const [savingEmailPref, setSavingEmailPref] = useState(false);

  async function toggleEmailPref() {
    setSavingEmailPref(true);
    try {
      await apiPatch("/users/me", { emailOptOut: emailsOn });
      await refreshUser();
    } finally {
      setSavingEmailPref(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    if (name.trim().length < 3) return setProfileError("Name must be at least 3 characters.");

    setSavingProfile(true);
    try {
      await apiPatch("/users/me", { name: name.trim(), city: city.trim(), phone: phone.trim() });
      await refreshUser();
      setProfileSuccess("Profile updated.");
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Couldn't save your profile. Try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 6) return setPasswordError("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("New passwords don't match.");

    setSavingPassword(true);
    try {
      await apiPatch("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password changed successfully.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Couldn't change your password. Try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader icon="⚙️" title="Settings" subtitle="Manage your profile, password, and preferences." />

      <form onSubmit={handleSaveProfile} className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name ?? "?"} size={44} />
          <div>
            <p className="font-bold">Profile</p>
            <p className="text-sm text-muted">How you appear to other people on LendAHand.</p>
          </div>
        </div>

        {profileError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="rounded-xl bg-green/10 text-green text-sm px-4 py-3">✅ {profileSuccess}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Full name</label>
            <input required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ayesha Khan" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">Email</label>
            <input className="input-field opacity-60 cursor-not-allowed" value={user?.email ?? ""} readOnly disabled />
            <p className="text-xs text-muted mt-1">Your email is your login and can't be changed.</p>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">City</label>
            <input className="input-field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">Phone</label>
            <input type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" />
            <p className="text-xs text-muted mt-1">Only shared with people you choose to coordinate tasks with.</p>
          </div>
        </div>

        <button type="submit" disabled={savingProfile} className="btn-primary">
          {savingProfile ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="card p-5 space-y-4">
        <div>
          <p className="font-bold">🔒 Change Password</p>
          <p className="text-sm text-muted">Use at least 6 characters for your new password.</p>
        </div>

        {passwordError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3">
            {passwordError}
          </div>
        )}
        {passwordSuccess && (
          <div className="rounded-xl bg-green/10 text-green text-sm px-4 py-3">✅ {passwordSuccess}</div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Current password</label>
            <input
              type="password"
              required
              className="input-field"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">New password</label>
            <input
              type="password"
              required
              className="input-field"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">Confirm new password</label>
            <input
              type="password"
              required
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" disabled={savingPassword} className="btn-secondary">
          {savingPassword ? "Updating..." : "Update Password"}
        </button>
      </form>

      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold">🌙 Appearance</p>
          <p className="text-sm text-muted">Switch between light and dark mode.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Toggle dark mode"
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            dark ? "bg-coral" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              dark ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold">✉️ Email Notifications</p>
          <p className="text-sm text-muted">
            Get occasional emails like review requests and tips. Important account and task emails are always sent.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailsOn}
          aria-label="Toggle non-essential emails"
          disabled={savingEmailPref}
          onClick={toggleEmailPref}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            emailsOn ? "bg-coral" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              emailsOn ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold">Log Out</p>
          <p className="text-sm text-muted">You'll be signed out on this device.</p>
        </div>
        <button onClick={handleLogout} className="btn-ghost-danger shrink-0">
          Log Out
        </button>
      </div>
    </div>
  );
}
