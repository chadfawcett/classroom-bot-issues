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

    const starterRepo = context.repo({ repo: starterName })
    const studentRepo = context.repo()

    //  Copy each issue to student repository
    context.log(
      `Copying issues from ${starterRepo.repo} to ${studentRepo.repo}`
    )
    //  Get all the issues from our starter repo
    const issues = (await context.github.issues.listForRepo(
      starterRepo
    )).data.filter(i => !i.pull_request) //  Filter out pull requests

    await Promise.all(
      issues.map(({ number, title, body }) => {
        context.log.debug(
          `Copying ${starterRepo.owner}/${starterRepo.repo}#${number} to ${
            studentRepo.owner
          }/${studentRepo.repo}`
        )

        return context.github.issues.create({ ...studentRepo, title, body })
      })
    )

    //  Copy each pull request to student repository
    context.log(`Copying PRs from ${starterRepo.repo} to ${studentRepo.repo}`)
    //  Get all the prs from our starter repo
    const prs = (await context.github.pullRequests.list(starterRepo)).data

    await Promise.all(
      prs.map(({ number, title, body, head, base }) => {
        context.log.debug(
          `Copying ${starterRepo.owner}/${starterRepo.repo}#${number} to ${
            studentRepo.owner
          }/${studentRepo.repo}`
        )

        return context.github.pullRequests.create({
          ...studentRepo,
          title,
          body,
          head: head.ref,
          base: base.ref
        })
      })
    )
  })

  app.on('error', error => {
    console.log(
      `Error occured in "${error.event.name} handler: ${error.stack}"`
    )
  })
}
