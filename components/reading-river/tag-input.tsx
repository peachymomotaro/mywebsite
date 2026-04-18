"use client";

import { useEffect, useId, useRef, useState } from "react";

type TagInputProps = {
  defaultValue?: string;
  knownTagNames?: string[];
  label?: string;
  name?: string;
  placeholder?: string;
};

function getCurrentTagFragment(value: string) {
  return value.split(",").at(-1)?.trim() ?? "";
}

function replaceCurrentTagFragment(value: string, tagName: string) {
  const lastCommaIndex = value.lastIndexOf(",");

  if (lastCommaIndex === -1) {
    return tagName;
  }

  const prefix = `${value.slice(0, lastCommaIndex + 1).replace(/\s*$/, "")} `;

  return `${prefix}${tagName}`;
}

export function TagInput({
  defaultValue = "",
  knownTagNames = [],
  label = "Tags",
  name = "tagNames",
  placeholder = "focus, essays",
}: TagInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const form = inputRef.current?.form;

    if (!form) {
      return;
    }

    const handleReset = () => {
      setValue(defaultValue);
    };

    form.addEventListener("reset", handleReset);

    return () => {
      form.removeEventListener("reset", handleReset);
    };
  }, [defaultValue]);

  const currentFragment = getCurrentTagFragment(value);
  const normalizedFragment = currentFragment.toLowerCase();
  const suggestions =
    normalizedFragment.length === 0
      ? []
      : knownTagNames.filter((tagName) => {
          const normalizedTagName = tagName.toLowerCase();

          return (
            normalizedTagName.startsWith(normalizedFragment) &&
            normalizedTagName !== normalizedFragment
          );
        });

  return (
    <div className="grid gap-2 text-sm">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        ref={inputRef}
        name={name}
        type="text"
        value={value}
        placeholder={placeholder}
        className="intake-input"
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      {knownTagNames.length > 0 ? (
        <p className="intake-helper-text">
          Separate tags with commas. Start typing to reuse a tag you&apos;ve already used.
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="tag-input-suggestions" aria-label="Remembered tag suggestions">
          {suggestions.map((tagName) => (
            <button
              key={tagName}
              type="button"
              className="tag-input-suggestion"
              onClick={() => {
                setValue(replaceCurrentTagFragment(value, tagName));
              }}
            >
              {tagName}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
