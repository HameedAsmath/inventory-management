module.exports = {
  apps: [
    {
      name: "inventory-management",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development",
        ENV_VALUE: "development",
      },
    },
  ],
};
