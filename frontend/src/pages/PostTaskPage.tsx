import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Category, Task } from "../types";
import { PageHero } from "../components/ui/PageHero";

export function PostTaskPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [estimate, setEstimate] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    apiGet<{ categories: Category[] }>("/categories").then(({ categories }) => {
      setCategories(categories);
      if (categories.length) setCategoryId(String(categories[categories.length - 1].id));
    });
  }, []);

  async function handleEstimate() {
    if (description.trim().length < 10) {
      setError("Add a bit more detail to your description before requesting an estimate.");
      return;
    }
    setError(null);
    setEstimating(true);
    try {
      const { estimate } = await apiPost<{ estimate: string }>("/ai/price-estimate", { description });
      setEstimate(estimate);
    } catch (err) {
      setEstimate(err instanceof ApiError ? err.message : "Couldn't get an estimate right now.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const budgetNum = Number(budget);
    if (!budgetNum || budgetNum <= 0) return setError("Enter a valid budget.");
    if (user && budgetNum > user.walletBalance) {
      setError(`Your budget (Rs. ${budgetNum}) is higher than your wallet balance (Rs. ${user.walletBalance.toFixed(0)}). You can still post — you'll need to top up before accepting a bid.`);
    }

    setSubmitting(true);
    try {
      const { task } = await apiPost<{ task: Task }>("/tasks", {
        title,
        description,
        categoryId: Number(categoryId),
        address,
        budget: budgetNum,
      });
      await refreshUser();
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't post your task. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Post a task"
        title="What do you need done?"
        subtitle="Describe it, set a budget, and helpers will start bidding."
        glyph="➕"
      />

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-2 card p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold mb-1 block">Title</label>
            <input required className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Move a couch to the 3rd floor" />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Description</label>
            <textarea
              required
              rows={5}
              className="input-field resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give as much detail as you can — this also helps the AI estimator."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Category</label>
              <select required className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Budget (Rs.)</label>
              <input required type="number" min="1" className="input-field" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Address</label>
            <input required className="input-field" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" />
            <p className="text-xs text-muted mt-1">We'll geocode this automatically so Helpers can find you on the map.</p>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Posting..." : "Post Task"}
          </button>
        </form>

        <div className="rounded-card bg-ink text-paper dark:bg-white dark:text-ink p-6 space-y-3">
          <p className="eyebrow !text-paper/50 dark:!text-ink/50">✨ AI Estimator</p>
          <p className="font-display font-semibold text-lg leading-snug">Not sure what to pay?</p>
          <p className="text-sm text-paper/60 dark:text-ink/60">Get a Gemini-powered suggestion for a fair price and time estimate from your description.</p>
          <button
            type="button"
            onClick={handleEstimate}
            disabled={estimating}
            className="w-full rounded-full py-2.5 font-semibold bg-paper text-ink dark:bg-ink dark:text-paper hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {estimating ? "Thinking…" : "Get AI Estimate"}
          </button>
          {estimate && (
            <div className="rounded-xl bg-paper/10 dark:bg-ink/10 border border-paper/20 dark:border-ink/20 p-3 text-sm leading-relaxed">
              {estimate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
