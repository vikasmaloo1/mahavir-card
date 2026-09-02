"use client";

export function ContactScrollLink({ className }: { className?: string }) {
  function handleClick() {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      Contact
    </button>
  );
}
