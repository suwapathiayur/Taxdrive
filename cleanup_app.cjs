const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf-8');

content = content.replace(/<input type="file" ref={fileInputRef}.*?\/>/, '');
content = content.replace(/const fileInputRef = useRef<HTMLInputElement>\(null\);/, '');
content = content.replace(/const handleImport =.*?};\n    reader.readAsText\(file\);\n    e.target.value = '';\n  };\n/s, '');

fs.writeFileSync('App.tsx', content);
