import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    // Create all tables manually (idempotent)
    const statements = [
      `CREATE TABLE IF NOT EXISTS \`tasks\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`title\` varchar(512) NOT NULL,
        \`description\` text,
        \`status\` enum('pending','running','paused','completed','error') NOT NULL DEFAULT 'pending',
        \`currentPhaseIndex\` int NOT NULL DEFAULT 0,
        \`totalPhases\` int NOT NULL DEFAULT 7,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`tasks_id\` PRIMARY KEY(\`id\`)
      )`,
      `CREATE TABLE IF NOT EXISTS \`task_phases\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`taskId\` int NOT NULL,
        \`phaseIndex\` int NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`status\` enum('pending','active','completed','error') NOT NULL DEFAULT 'pending',
        \`notes\` text,
        \`startedAt\` timestamp NULL,
        \`completedAt\` timestamp NULL,
        CONSTRAINT \`task_phases_id\` PRIMARY KEY(\`id\`)
      )`,
      `CREATE TABLE IF NOT EXISTS \`task_memory\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`taskId\` int NOT NULL,
        \`fileType\` enum('task_plan','findings','progress') NOT NULL,
        \`content\` longtext NOT NULL,
        \`storageKey\` varchar(512),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`task_memory_id\` PRIMARY KEY(\`id\`)
      )`,
      `CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`taskId\` int NOT NULL,
        \`role\` enum('user','assistant','system') NOT NULL,
        \`content\` longtext NOT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`chat_messages_id\` PRIMARY KEY(\`id\`)
      )`,
      `CREATE TABLE IF NOT EXISTS \`error_logs\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`taskId\` int NOT NULL,
        \`error\` text NOT NULL,
        \`attempt\` int NOT NULL DEFAULT 1,
        \`resolution\` text,
        \`escalated\` int NOT NULL DEFAULT 0,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`error_logs_id\` PRIMARY KEY(\`id\`)
      )`,
      `CREATE TABLE IF NOT EXISTS \`agent_sessions\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`userId\` int NOT NULL,
        \`taskId\` int NOT NULL,
        \`contextSnapshot\` longtext,
        \`isActive\` int NOT NULL DEFAULT 0,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`endedAt\` timestamp NULL,
        CONSTRAINT \`agent_sessions_id\` PRIMARY KEY(\`id\`)
      )`,
    ];

    for (const sql of statements) {
      await conn.execute(sql);
      console.log('✓ Table created/verified');
    }
    console.log('All tables ready!');
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
