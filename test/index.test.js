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

    //  No config
    nock('https://api.github.com')
      .get(
        `/repos/${payload.repository.owner.login}/assignment-${
          payload.sender.login
        }/contents/.github/config.yml`
      )
      .reply(404, { message: 'Not Found' })

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

  test('starter repo name defaults if no config is provided', () => {
    //  Change organization name
    const customPayload = {
      ...payload,
      repository: {
        ...payload.repository,
        owner: { ...payload.repository.owner, login: 'no-config' }
      }
    }

    //  Test that we correctly return a test token
    nock('https://api.github.com')
      .post(`/app/installations/${customPayload.installation.id}/access_tokens`)
      .reply(200, { token: 'test' })

    //  No config
    nock('https://api.github.com')
      .get(
        `/repos/${customPayload.repository.owner.login}/assignment-${
          customPayload.sender.login
        }/contents/.github/config.yml`
      )
      .reply(404, { message: 'Not Found' })

    //  Receive new issues
    nock('https://api.github.com')
      .post(
        `/repos/${customPayload.repository.owner.login}/assignment-${
          customPayload.sender.login
        }/issues`
      )
      .times(starterIssues.length)
      .reply(200)

    //  Confirm starter repo is queried
    nock('https://api.github.com')
      .get(
        `/repos/${
          customPayload.repository.owner.login
        }/assignment-starter/issues`,
        () => {
          expect(true).toBeTruthy()
          return true
        }
      )
      .reply(200, starterIssues)

    return probot.receive({ name: 'repository_import', payload: customPayload })
  })

  test('starter repo name is set to custom config value', () => {
    //  Change organization name
    const customPayload = {
      ...payload,
      repository: {
        ...payload.repository,
        owner: { ...payload.repository.owner, login: 'config' }
      }
    }

    //  Test that we correctly return a test token
    nock('https://api.github.com')
      .post(`/app/installations/${customPayload.installation.id}/access_tokens`)
      .reply(200, { token: 'test' })

    //  Custom config
    nock('https://api.github.com')
      .get(
        `/repos/${customPayload.repository.owner.login}/assignment-${
          customPayload.sender.login
        }/contents/.github/config.yml`
      )
      .reply(200, {
        content: new Buffer(
          'issues:\n  starterName: config-repo-starter'
        ).toString('base64')
      })

    //  Receive new issues
    nock('https://api.github.com')
      .post(
        `/repos/${customPayload.repository.owner.login}/assignment-${
          customPayload.sender.login
        }/issues`
      )
      .times(starterIssues.length)
      .reply(200)

    //  Confirm starter repo is queried
    nock('https://api.github.com')
      .get(
        `/repos/${
          customPayload.repository.owner.login
        }/config-repo-starter/issues`,
        () => {
          expect(true).toBeTruthy()
          return true
        }
      )
      .reply(200, starterIssues)

    return probot.receive({ name: 'repository_import', payload: customPayload })
  })
})
