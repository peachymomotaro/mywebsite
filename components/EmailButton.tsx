"use client";

type EmailButtonProps = {
  className?: string;
  label?: string;
  subject?: string;
};

function buildEmailAddress() {
  return ["curry", ".", "peter", String.fromCharCode(64), "googlemail", ".", "com"].join("");
}

export default function EmailButton({
  className,
  label = "Email me",
  subject,
}: EmailButtonProps) {
  const handleClick = () => {
    const subjectQuery = subject ? `?subject=${encodeURIComponent(subject)}` : "";
    const emailLink = document.createElement("a");

    emailLink.href = `mailto:${buildEmailAddress()}${subjectQuery}`;
    emailLink.click();
  };

  return (
    <button className={className} type="button" onClick={handleClick}>
      {label}
    </button>
  );
}
