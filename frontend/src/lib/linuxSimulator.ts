export interface SimulatorResult { output: string; explanation: string; cwd: string }
export interface SimulatorSnapshot { cwd: string; files: Record<string, string>; directories: string[] }

const INITIAL_FILES: Record<string, string> = {
  '/etc/hostname': 'fieldnotes-lab\n',
  '/etc/hosts': '127.0.0.1 localhost\n10.0.4.18 app.internal\n10.0.4.22 db.internal\n',
  '/etc/resolv.conf': 'nameserver 10.0.0.53\nsearch internal.example\n',
  '/etc/os-release': 'NAME="Ubuntu"\nVERSION="24.04 LTS"\nID=ubuntu\n',
  '/srv/app/config.yml': 'port: 8080\nlog_level: info\n',
  '/var/log/app.log': '2026-10-29T09:18:12Z INFO server ready\n2026-10-29T09:22:41Z WARN disk usage reached 87%\n2026-10-29T09:24:03Z ERROR failed to write cache: no space left on device\n',
  '/var/log/nginx/error.log': '2026/10/29 09:14:22 [error] connect() failed (111: Connection refused) while connecting to upstream\n',
  '/home/learner/notes.txt': 'Linux Copilot is a safe, simulated practice environment.\n',
  '/home/learner/todo.txt': 'Review file permissions\nPractice process troubleshooting\n',
};
const DIRS = ['/bin','/dev','/etc','/home','/home/learner','/proc','/root','/run','/srv','/srv/app','/tmp','/usr','/usr/bin','/var','/var/log'];
const COMMANDS = ['pwd','ls','cd','cat','mkdir','touch','grep','find','whoami','date','uname','df','free','ps','help','clear'];
const HELP: Record<string,string> = {
  pwd:'Print the full path of your current directory.', ls:'List files and directories. Try ls -la or ls /var/log.', cd:'Change directories. Use cd .. to move up, or cd with no path to return home.', cat:'Display a text file, for example cat /etc/hostname.', mkdir:'Create a directory inside the virtual filesystem.', touch:'Create an empty virtual file.', grep:'Find matching text: grep ERROR /var/log/app.log.', find:'List virtual paths beneath a directory: find /var/log.', whoami:'Show the simulated user.', date:'Show a fixed simulated system time.', uname:'Show simulated operating system details. Try uname -a.', df:'Show simulated filesystem capacity. Try df -h.', free:'Show simulated memory usage. Try free -h.', ps:'List simulated processes. Try ps aux.', help:'List available simulated commands.', clear:'Clear the visible terminal output.',
};
function tokenize(input: string): string[] {
  const tokens = input.match(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^']*'|\S+/g) ?? [];
  return tokens.map((token) => token.replace(/^(?:"(.*)"|'(.*)')$/, (_, a, b) => a ?? b));
}
function normalize(path: string, cwd: string): string {
  const stack: string[] = [];
  for (const part of `${path.startsWith('/') ? '' : `${cwd}/`}${path}`.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop(); else stack.push(part);
  }
  return `/${stack.join('/')}`;
}
function parent(path: string): string { return path.slice(0, path.lastIndexOf('/')) || '/'; }

export class LinuxSimulator {
  private files = new Map(Object.entries(INITIAL_FILES));
  private dirs = new Set(DIRS);
  private cwd = '/home/learner';
  private user = 'learner';
  private clock = new Date('2026-10-29T09:30:00Z');
  private commandHistory: string[] = [];
  get currentDirectory() { return this.cwd; }
  get history() { return [...this.commandHistory]; }
  reset() { this.files = new Map(Object.entries(INITIAL_FILES)); this.dirs = new Set(DIRS); this.cwd = '/home/learner'; this.user = 'learner'; this.commandHistory = []; }
  snapshot(): SimulatorSnapshot { return { cwd: this.cwd, files: Object.fromEntries(this.files), directories: [...this.dirs] }; }
  execute(input: string): SimulatorResult {
    const tokens = tokenize(input.trim());
    const fail = (output: string, explanation = 'Check the command spelling, arguments, and path, then try again.') => ({ output, explanation, cwd: this.cwd });
    if (!tokens.length) return fail('');
    this.commandHistory.push(input.trim());
    if (/[;|&`$<>\\]/.test(input) || /\$\(/.test(input)) return fail('Only one plain simulated command is allowed at a time. Shell operators and expansions are disabled.');
    const [cmd, ...args] = tokens;
    if (!COMMANDS.includes(cmd)) return fail(`${cmd}: command not found. Type help to see supported commands.`);
    const pathArg = (value: string) => normalize(value, this.cwd);
    const list = (path: string, long = false, all = false): string => {
      if (!this.dirs.has(path) && !this.files.has(path)) return `${path}: No such file or directory`;
      if (this.files.has(path)) return long ? `-rw-r--r-- learner learner ${this.files.get(path)!.length.toString().padStart(5)} Oct 29 09:20 ${path.split('/').pop()}` : path.split('/').pop()!;
      const children = [...this.dirs].filter((item) => parent(item) === path).map((item) => item.split('/').pop() + '/').concat([...this.files.keys()].filter((item) => parent(item) === path).map((item) => item.split('/').pop()!)).sort();
      if (all) children.unshift('..', '.');
      return long ? children.map((name) => `${name.endsWith('/') ? 'drwxr-xr-x' : '-rw-r--r--'}  learner learner  ${name}`).join('\n') : children.join('  ');
    };
    let output = ''; let explanation = HELP[cmd];
    switch (cmd) {
      case 'pwd': output = this.cwd; break;
      case 'whoami': output = this.user; break;
      case 'date': output = this.clock.toUTCString(); break;
      case 'help': output = COMMANDS.join('  '); explanation = 'These commands run only against the local virtual Linux lab.'; break;
      case 'clear': output = ''; break;
      case 'cd': { const target = pathArg(args[0] || '/home/learner'); if (!this.dirs.has(target)) return fail(`cd: ${args[0] || target}: No such directory`); this.cwd = target; output = ''; break; }
      case 'ls': { const options = args.filter((arg) => arg.startsWith('-')); const targets = args.filter((arg) => !arg.startsWith('-')); output = (targets.length ? targets : ['.']).map((target) => list(pathArg(target), options.some((o) => o.includes('l')), options.some((o) => o.includes('a')))).join('\n'); if (!output) output = '(empty directory)'; break; }
      case 'cat': { if (!args.length) return fail('cat: missing file operand'); const target = pathArg(args[0]); if (!this.files.has(target)) return fail(`cat: ${args[0]}: No such file or directory`); output = this.files.get(target)!; break; }
      case 'mkdir': case 'touch': { if (!args.length) return fail(`${cmd}: missing operand`); for (const arg of args.filter((x) => !x.startsWith('-'))) { const target = pathArg(arg); if (target === '/' || this.files.has(target) || this.dirs.has(target)) return fail(`${cmd}: cannot create '${arg}': File exists`); if (!this.dirs.has(parent(target))) return fail(`${cmd}: cannot create '${arg}': No such directory`); if (cmd === 'mkdir') this.dirs.add(target); else this.files.set(target, ''); } output = ''; break; }
      case 'grep': { const pattern = args.find((x) => !x.startsWith('-')); const file = args.find((x) => x !== pattern && !x.startsWith('-')); if (!pattern || !file) return fail('Usage: grep [OPTION]... PATTERN FILE'); const target = pathArg(file); if (!this.files.has(target)) return fail(`grep: ${file}: No such file or directory`); const lines = this.files.get(target)!.split('\n').filter((line) => line.toLowerCase().includes(pattern.toLowerCase())); output = args.includes('-n') ? lines.map((line) => `${this.files.get(target)!.split('\n').indexOf(line) + 1}:${line}`).join('\n') : lines.join('\n'); if (!output) output = `No lines matching “${pattern}”.`; break; }
      case 'find': { const start = pathArg(args.find((x) => !x.startsWith('-')) || '.'); if (!this.dirs.has(start) && !this.files.has(start)) return fail(`find: '${start}': No such file or directory`); output = [start, ...[...this.dirs, ...this.files.keys()].filter((x) => x !== start && x.startsWith(start === '/' ? '/' : `${start}/`)).sort()].join('\n'); break; }
      case 'uname': output = args.includes('-a') ? 'Linux fieldnotes-lab 6.8.0-31-generic #31-Ubuntu SMP x86_64 GNU/Linux' : args.includes('-r') ? '6.8.0-31-generic' : 'Linux'; break;
      case 'df': output = 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        40G   35G  3.1G  92% /\ntmpfs           1.0G   12M 1012M   2% /run'; break;
      case 'free': output = '               total        used        free      shared  buff/cache   available\nMem:           7.7Gi       5.1Gi       812Mi       236Mi       1.8Gi       2.1Gi\nSwap:          2.0Gi       128Mi       1.9Gi'; break;
      case 'ps': output = 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 168000 12000 ?        Ss   08:10   0:02 /sbin/init\nwww-data   842 78.4  5.2 921000 412000 ?       Sl   09:12   4:31 /usr/bin/app-worker\nroot       911  0.3  0.4 245000 32000 ?        S    09:14   0:05 nginx: master'; break;
    }
    return { output: output || '(no output)', explanation, cwd: this.cwd };
  }
}

export const commandHelp = HELP;
