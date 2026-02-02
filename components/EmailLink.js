import { useEffect, useState } from "react";

export default function EmailLink({ label }) {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const user = "curry.peter";
    const domain = "googlemail.com";
    setEmail(`${user}@${domain}`);
  }, []);

  if (!email) {
    return <span>{label || "Email"}</span>;
  }

  return (
    <a href={`mailto:${email}`}>{label || email}</a>
  );
}
