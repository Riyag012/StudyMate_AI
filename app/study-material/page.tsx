
"use client";

import { useRef, useState } from "react";

const AI_API =
  process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8000";

type Source = {
  source: string;
  page: number;
  text: string;
  similarity: number;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  source: string;
};

async function readResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `The AI service returned an invalid response (HTTP ${response.status}).`,
    );
  }
}

export default function StudyMaterialPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [error, setError] = useState("");

  function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = Array.from(event.target.files ?? []);
    const validFiles = selected.filter(
      (file) =>
        file.name.toLowerCase().endsWith(".pdf") ||
        file.type === "application/pdf",
    );

    setError("");
    setStatus("");

    if (validFiles.length !== selected.length) {
      setError("Only PDF files are supported.");
    }

    if (validFiles.length > 10) {
      setFiles([]);
      setError("Select a maximum of 10 PDFs at a time.");
      event.target.value = "";
      return;
    }

    const oversized = validFiles.find(
      (file) => file.size > 20 * 1024 * 1024,
    );

    if (oversized) {
      setFiles([]);
      setError(`${oversized.name} exceeds the 20 MB file limit.`);
      event.target.value = "";
      return;
    }

    setFiles(validFiles);
  }

  async function uploadDocuments() {
    if (files.length === 0) {
      setError("Choose at least one PDF before clicking Index PDFs.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("Uploading PDFs and preparing document embeddings...");

    try {
      const form = new FormData();

      files.forEach((file) => form.append("files", file));
      form.append("workspace_id", "default");

      const response = await fetch(`${AI_API}/documents/upload`, {
        method: "POST",
        body: form,
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || `Document upload failed (HTTP ${response.status}).`,
        );
      }

      const warnings = (data.files ?? [])
        .filter((file: { warning?: string }) => file.warning)
        .map(
          (file: { filename: string; warning: string }) =>
            `${file.filename}: ${file.warning}`,
        );

      setStatus(
        `Successfully indexed ${data.total_chunks} text chunks from ${
          (data.files ?? []).length
        } file(s).${
          warnings.length ? ` Warnings: ${warnings.join(" ")}` : ""
        }`,
      );
    } catch (err) {
      setStatus("");
      setError(
        err instanceof Error
          ? `${err.message} Check that the AI service is running at ${AI_API}.`
          : "An unexpected upload error occurred.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) return;

    setBusy(true);
    setError("");
    setAnswer("");
    setSources([]);
    setQuiz([]);

    try {
      const response = await fetch(`${AI_API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          workspace_id: "default",
          top_k: 5,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || `Question failed (HTTP ${response.status}).`,
        );
      }

      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateQuiz() {
    setBusy(true);
    setError("");
    setQuiz([]);
    setSelectedAnswers({});

    try {
      const response = await fetch(`${AI_API}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: "default",
          number_of_questions: 5,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.detail || `Quiz generation failed (HTTP ${response.status}).`,
        );
      }

      setQuiz(data.questions ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">AI Study Companion</h1>
        <p className="text-gray-600">
          Upload your course material, ask questions, and test your understanding.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">
          1. Upload course material
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileSelection}
          disabled={busy}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-5 py-2 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Choose PDF files
          </button>

          <span className="text-sm text-gray-600">
            {files.length === 0
              ? "No files selected"
              : `${files.length} PDF file(s) selected`}
          </span>
        </div>

        {files.length > 0 && (
          <ul className="space-y-2 rounded-lg bg-gray-50 p-3">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="break-all">{file.name}</span>
                <span className="shrink-0 text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={uploadDocuments}
            disabled={busy || files.length === 0}
            className="rounded-lg bg-orange-600 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processing..." : "Index PDFs"}
          </button>

          {files.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFiles([]);
                setStatus("");
                setError("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="rounded-lg border px-5 py-2 disabled:opacity-50"
            >
              Clear selection
            </button>
          )}
        </div>

        {status && (
          <p role="status" className="whitespace-pre-wrap text-sm text-green-700">
            {status}
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">2. Ask your AI tutor</h2>

        <form onSubmit={askQuestion} className="space-y-3">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about your uploaded material..."
            rows={3}
            className="w-full rounded-lg border p-3"
          />

          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="rounded-lg bg-orange-600 px-5 py-2 text-white disabled:opacity-50"
          >
            Ask question
          </button>
        </form>

        {answer && (
          <article className="space-y-3 rounded-lg bg-gray-50 p-4">
            <h3 className="font-semibold">Answer</h3>
            <p className="whitespace-pre-wrap leading-7">{answer}</p>
          </article>
        )}

        {sources.length > 0 && (
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">
              Retrieved source passages
            </summary>

            <div className="mt-4 space-y-4">
              {sources.map((source, index) => (
                <article
                  key={`${source.source}-${source.page}-${index}`}
                  className="border-b pb-3 last:border-0"
                >
                  <p className="font-medium">
                    {source.source}, page {source.page}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Similarity: {source.similarity}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{source.text}</p>
                </article>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">3. Practice quiz</h2>

        <button
          type="button"
          onClick={generateQuiz}
          disabled={busy}
          className="rounded-lg bg-orange-600 px-5 py-2 text-white disabled:opacity-50"
        >
          Generate 5 questions
        </button>

        {quiz.map((item, index) => (
          <article
            key={`${index}-${item.question}`}
            className="space-y-3 rounded-lg bg-gray-50 p-4"
          >
            <h3 className="font-semibold">
              {index + 1}. {item.question}
            </h3>

            {item.options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-2"
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={option}
                  checked={selectedAnswers[index] === option}
                  onChange={() =>
                    setSelectedAnswers((previous) => ({
                      ...previous,
                      [index]: option,
                    }))
                  }
                />
                <span>{option}</span>
              </label>
            ))}

            {selectedAnswers[index] && (
              <div className="space-y-1 border-t pt-3 text-sm">
                <p>
                  <strong>Correct answer:</strong> {item.correct_answer}
                </p>
                <p>
                  <strong>Explanation:</strong> {item.explanation}
                </p>
                <p>
                  <strong>Source:</strong> {item.source}
                </p>
              </div>
            )}
          </article>
        ))}

        {quiz.length > 0 && (
          <p className="font-semibold">
            Score:{" "}
            {
              quiz.filter(
                (item, index) =>
                  selectedAnswers[index] === item.correct_answer,
              ).length
            } / {quiz.length}
          </p>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="break-words rounded-lg border border-red-300 bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      )}
    </main>
  );
}
