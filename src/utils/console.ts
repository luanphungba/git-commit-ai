import chalk from 'chalk';

export const log = {
  info: (...args: any[]) => console.log(chalk.blue(...args)),
  success: (...args: any[]) => console.log(chalk.green(...args)),
  warning: (...args: any[]) => console.log(chalk.yellow(...args)),
  error: (...args: any[]) => console.log(chalk.red(...args)),
  cyan: (...args: any[]) => console.log(chalk.cyan(...args))
}; 