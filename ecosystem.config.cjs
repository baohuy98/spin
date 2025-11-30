module.exports = {
  apps: [{
    name: "SHRCSPIN",
    script: "npm",
    args: "run preview -- --host",
    error_file: "./pm2-error.log",
    out_file: "./pm2-out.log",
  }]
}