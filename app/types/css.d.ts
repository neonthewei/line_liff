// This file helps TypeScript and your IDE recognize Tailwind CSS directives
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Add support for @tailwind, @layer and @apply directives
declare module 'postcss-import';
declare module 'tailwindcss';
declare module 'autoprefixer'; 