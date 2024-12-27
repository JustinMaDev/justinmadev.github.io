document.addEventListener("DOMContentLoaded", function () { 
  mermaid.initialize({
    startOnLoad: true,
    theme: "base",
  });
  const mermaidBlocks = document.querySelectorAll('pre > code.language-mermaid');
  mermaidBlocks.forEach((block) => {
    // Add 'class_name' marker to pre lable. This is used to identify mermaid blocks in custom.css
    block.parentElement.setAttribute('class_name', 'language-mermaid'); 
  });
  mermaid.init(undefined, mermaidBlocks);
});