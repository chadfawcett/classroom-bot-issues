module.exports = app => {
  app.log('Yay, the Classroom Bot Issues App was loaded!')

  app.on('repository_import', async context => {
    const {
      repository: { name: studentRepoName },
      sender: { login: studentLogin }
    } = context.payload
    const config = await context.config('config.yml', { issues: {} })

    //  Starter name is either defined in config, or replaces student name with
    //  "starter" (eg assignment-student1 -> assignment-starter)
    const starterName =
      config.issues.starterName ||
      studentRepoName.replace(studentLogin, 'starter')

    context.log(`Copying issues from ${starterName} to ${context.repo().repo}`)

    //  Get all the issues from our starter repo
    const starterRepo = context.repo({ repo: starterName })
    const issues = (await context.github.issues.listForRepo(
      starterRepo
    )).data.filter(i => !i.pull_request) //  Filter out pull requests

    //  Copy each issue to student repository
    await Promise.all(
      issues.map(({ number, title, body }) => {
        context.log.debug(
          `Copying ${context.repo().owner}/${starterName}#${number} to ${
            context.repo().owner
          }/${context.repo().repo}`
        )

        return context.github.issues.create({ ...context.repo(), title, body })
      })
    )
  })

  app.on('error', error => {
    console.log(
      `Error occured in "${error.event.name} handler: ${error.stack}"`
    )
  })
}
