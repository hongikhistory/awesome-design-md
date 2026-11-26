// Loaded on demand only. The polyfill import must stay first: kordoc reads Buffer/process
// while its modules evaluate.
import "../../node-shims/polyfill.js";
export { parse, markdownToHwpx, fillForm, extractFormSchema, redactText, lintGongmunText, detectFormat } from "kordoc";
