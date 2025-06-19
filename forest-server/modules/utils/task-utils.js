export function generateTasksForPrompt(prompt, options = {}) {
  const {
    singleTaskMode = false,
    maxTasks = 10
  } = options;

  return {
    prompt,
    mode: singleTaskMode ? 'single' : 'multiple',
    maxTasks
  };
}