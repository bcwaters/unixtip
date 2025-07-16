# Unix AI Assistant

An AI-powered command-line tool that helps you find and execute Unix/Linux commands using OpenAI's GPT models.

## Features

- 🤖 Query AI for Unix commands using natural language
- 🚀 Interactive menu-driven interface
- ⚡ Direct command-line queries
- 🔒 Safe command execution with confirmation prompts
- 📝 Command output display

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up OpenAI API key:**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a `.env` file in the project root
   - Add your API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```
3. **Install globally from this git repository**
- Run the following command to install the CLI globally (replace with your repo URL):
  ```bash
  npm install -g 
  ```
- Now you can use the `unixtip` command from anywhere:
  ```bash
  unixtip "how to list all running processes"
  ```

## Usage

### Interactive Mode
Start the interactive menu:
```bash
node index.js greet
```

### Direct Query
Query for a specific Unix command:
```bash
node index.js query "how to find all files larger than 100MB"
```

## Examples

**Interactive Mode:**
```
🚀 Unix AI Assistant - Your AI-powered Unix command helper
? What would you like to do? (Use arrow keys)
❯ Ask AI for Unix command
  Create a file
  Edit a file
  Exit
```

**Direct Query:**
```bash
$ node index.js query "compress all jpg files in current directory"
🤖 Querying AI for Unix command...

💡 Suggested command:

```bash
find . -name "*.jpg" -exec gzip {} \;
```
```

## Safety Features

- ⚠️ Warning prompts before executing AI-generated commands
- 🔍 Command validation and confirmation
- 🛡️ Error handling for API failures
- 📋 Clear command output display

## Requirements

- Node.js 14+
- OpenAI API key
- Internet connection for API calls

## License

ISC 