#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');

// Suppress error output and exit cleanly on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  process.exit(0);
});

// Load .env from the script's directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create the prompt function
const prompt = inquirer.createPromptModule();

const promptPath = path.join(__dirname, 'system_prompt.txt');
let systemPrompt = '';
try {
  systemPrompt = fs.readFileSync(promptPath, 'utf8').trim();
} catch (e) {
  console.error('❌ Could not load system prompt from system_prompt.txt:', e.message);
  process.exit(1);
}

// Store the output of the previous executed command
let prevCommandOutput = null;
let prevCommand = null;

// Function to query OpenAI for Unix command
async function queryUnixCommand(userQuery) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Error: OPENAI_API_KEY environment variable is not set.');
      console.log('Please set your OpenAI API key:');
      console.log('1. Get your API key from https://platform.openai.com/api-keys');
      console.log('2. Create a .env file in the project root');
      console.log('3. Add: OPENAI_API_KEY=your_api_key_here');
      return null;
    }

    // Gather context: pwd and ls
    let pwdOutput = '';
    let lsOutput = '';
    try {
      pwdOutput = execSync('pwd', { encoding: 'utf8' }).trim();
    } catch (e) {
      pwdOutput = '[Error running pwd]';
    }
    try {
      lsOutput = execSync('ls', { encoding: 'utf8' }).trim();
    } catch (e) {
      lsOutput = '[Error running ls]';
    }

    // Add previous command context
    let prevCommandSection = '';
    if (prevCommand === null) {
      prevCommandSection = 'PRIOR COMMAND: No previous command has been executed.';
    } else {
      prevCommandSection = `PRIOR COMMAND: ${prevCommand}`;
    }

    // Add previous command output context
    let prevOutputSection = '';
    if (prevCommandOutput === null) {
      prevOutputSection = 'PREV COMMAND OUTPUT: No previous command has been executed.';
    } else {
      prevOutputSection = `PREV COMMAND OUTPUT:\n${prevCommandOutput}`;
    }

    // Enhance the system prompt with context
    const enhancedSystemPrompt = `${systemPrompt}\n\nThe user's current directory is:\n${pwdOutput}\n\nThe directory contains:\n${lsOutput}\n\n${prevCommandSection}\n${prevOutputSection}\n`;

    console.log('\n--- SYSTEM PROMPT SENT TO OPENAI ---\n');
    console.log(enhancedSystemPrompt);
    console.log('\n--- END SYSTEM PROMPT ---\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: enhancedSystemPrompt
        },
        {
          role: "user",
          content: `Give me a Unix command for: ${userQuery}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const command = completion.choices[0].message.content.trim();
    return command;
  } catch (error) {
    console.error('❌ Error querying OpenAI:', error.message);
    return null;
  }
}

// Function to copy command to clipboard using xclip, xsel, or wl-copy
function copyToClipboard(command) {
  try {
    // Try xclip (X11) with input option
    execSync('xclip -selection clipboard', {
      input: command,
      stdio: ['pipe', 'ignore', 'ignore'],
      timeout: 2000
    });
    //console.log('📋 Command copied to clipboard!');
    return;
  } catch (error) {
    console.log('⚠️  Could not copy to clipboard:', error.message);
  }
}

// Function to execute command using execSync
function executeCommandSync(command) {
  try {
    console.log('\n🔄 Executing command...\n');
    const output = execSync(command, { encoding: 'utf8' });
    prevCommand = command;
    prevCommandOutput = output ? output.trim() : '[No output]';
    if (output) {
      console.log('📤 Command output:');
      console.log(output);
    }
  } catch (error) {
    prevCommand = command;
    let out = '';
    if (error.stdout) out += error.stdout.toString();
    if (error.stderr) out += error.stderr.toString();
    prevCommandOutput = out.trim() || '[Error executing command]';
    console.error('❌ Error executing command:', error.message);
  }
}

// Function to show the menu and handle continuous prompting
async function runInteractiveLoop() {
  console.log('🚀 Unix AI Assistant - Your AI-powered Unix command helper');
  try {
    while (true) {
      // Show interactive menu with arrow key navigation
      const answers = await prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: ['Ask AI for Unix command', 'Exit'],
        },
      ]);

      // Handle the selected option
      switch (answers.action) {
        case 'Ask AI for Unix command':
          await handleUnixCommandQuery();
          break;
        case 'Exit':
          console.log('👋 Goodbye!');
          return; // Exit the loop
      }
    }
  } catch (err) {
    if (
      err &&
      (err.name === 'ExitPromptError' ||
        (err.message && err.message.includes('SIGINT')))
    ) {
      // Suppress error and exit silently
      process.exit(0);
    }
    // For other errors, rethrow
    throw err;
  }
}

// Function to handle Unix command queries
async function handleUnixCommandQuery() {
  const queryAnswer = await prompt([
    {
      type: 'input',
      name: 'query',
      message: 'What Unix command do you need help with?',
      validate: (input) => {
        if (input.trim().length === 0) {
          return 'Please enter a query';
        }
        return true;
      }
    }
  ]);

  const command = await queryUnixCommand(queryAnswer.query);
  
  if (command) {
    copyToClipboard(command);
    console.log('💡 Suggested command:\n');
    console.log(`\x1b[44m\x1b[37m${command}\x1b[0m\n`); // Blue background, white text
    
    
    // Ask if user wants to execute the command
    const executeAnswer = await prompt([
      {
        type: 'confirm',
        name: 'execute',
        message: 'Would you like to execute this command?',
        default: false
      }
    ]);

    if (executeAnswer.execute) {
      console.log('\n⚠️  Warning: Executing AI-generated commands can be risky.');
      console.log('Make sure you understand what the command does before proceeding.\n');
      executeCommandSync(command);
    }
  }
}

// Check if arguments were passed directly (for unixtip command)
const args = process.argv.slice(2);
if (args.length > 0 && !args[0].startsWith('-')) {
  // Direct command usage: unixtip "how to do something"
  const query = args.join(' ').trim();
  if (!query) {
    // If the query is empty, show the interactive menu
    (async () => {
      await runInteractiveLoop();
      process.exit(0);
    })();
    return;
  }
  (async () => {
    const command = await queryUnixCommand(query);
    if (command) {
      copyToClipboard(command);
      console.log(`\x1b[44m\x1b[37m  ${command}  \x1b[0m\n`); // Blue background, white text with padding
      //executeCommandSync(command);
    }
    // Use setImmediate to ensure all output is flushed before exit
    setImmediate(() => process.exit(0));
  })();
  return;
}

// If no command is provided, show the interactive menu and exit
if (args.length === 0) {
  (async () => {
    await runInteractiveLoop();
    process.exit(0);
  })();
  return;
}

// Otherwise, let commander handle subcommands/options
program
  .command('greet')
  .description('Display Hello World and start an interactive menu')
  .action(async () => {
    await runInteractiveLoop();
  });

// New command for direct Unix command queries
program
  .command('query <question>')
  .description('Query AI for a Unix command')
  .action(async (question) => {
    const command = await queryUnixCommand(question);
    if (command) {
      copyToClipboard(command);
      console.log('💡 Suggested command:\n');
      console.log(`\x1b[44m\x1b[37m${command}\x1b[0m\n`); // Blue background, white text
    }
  });

// Parse the command-line arguments
program.parse(process.argv);
