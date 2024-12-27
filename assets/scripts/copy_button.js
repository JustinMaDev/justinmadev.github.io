document.addEventListener("DOMContentLoaded", function () {
  // Find all code blocks in the page
  const codeBlocks = document.querySelectorAll("pre:not([class_name='language-mermaid'])");

  codeBlocks.forEach((block) => {
    // Create the "Copy" button
    const button = document.createElement("button");
    button.textContent = "Copy";
    button.className = "copy-btn";

    // Add the button to the code block
    block.appendChild(button);

    // Add click event to copy the code content
    button.addEventListener("click", () => {
      const code = block.querySelector("code");
      if (code) {
        const text = code.textContent;
        navigator.clipboard.writeText(text).then(() => {
          button.textContent = "Copied";
          setTimeout(() => (button.textContent = "Copy"), 10000);
        }).catch((err) => {
          console.error("Failed to copy text: ", err);
        });
      }
    });
  });
});
  