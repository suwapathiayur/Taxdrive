sed -i -e '/if (!db.objectStoreNames.contains('"'"'vehicles'"'"')) {/,/          db.createObjectStore('"'"'vehicles'"'"', { keyPath: '"'"'id'"'"' });/c \
        if (!db.objectStoreNames.contains('"'"'vehicles'"'"')) {\
          db.createObjectStore('"'"'vehicles'"'"', { keyPath: '"'"'id'"'"' });\
        }\
        if (!db.objectStoreNames.contains('"'"'maintenance'"'"')) {\
          db.createObjectStore('"'"'maintenance'"'"', { keyPath: '"'"'id'"'"' });' services/db.ts
