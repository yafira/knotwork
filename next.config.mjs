const nextConfig = {
  // the notes folder is read when pages are rebuilt, so ship it with the server
  outputFileTracingIncludes: {
    '/**': ['./notes/**/*']
  }
}

export default nextConfig
