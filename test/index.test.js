const nock = require('nock')
const classroomBotIssues = require('..')
const { Probot } = require('probot')
const payload = require('./fixtures/events/repository_import.success.json')
//  We only want the title and body from fixtures
const starterIssues = require('./fixtures/issues.json')

nock.disableNetConnect()

describe('Classroom Bot Issues', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    //  Load our app into probot
    const app = probot.load(classroomBotIssues)

    //  Just return a test token
    app.app = () => 'test'

    //  Return starter issues
    nock('https://api.github.com')
      .get(`/repos/${payload.repository.owner.login}/assignment-starter/issues`)
      .reply(200, starterIssues)
  })

  test('copies issues from starter to newly imported repo', () => {
    expect.assertions(2)
    //  Test that we correctly return a test token
    nock('https://api.github.com')
      .post(`/app/installations/${payload.installation.id}/access_tokens`)
      .reply(200, { token: 'test' })

    //  Test that issues are created in student repo
    nock('https://api.github.com')
      .post(
        `/repos/${payload.repository.owner.login}/${
          payload.repository.name
        }/issues`,
        body => {
          //  We only want the issue title and body for comparison
          const issueTitlesandBodies = starterIssues.map(({ title, body }) => ({
            title,
            body
          }))
          expect(issueTitlesandBodies).toContainEqual(body)
          return true
        }
      )
      .times(starterIssues.length)
      .reply(200)

    //  Receive a webhook event
    return probot.receive({ name: 'repository_import', payload })
  })
})
