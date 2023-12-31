const SendBird = require("sendbird");
const fetch = require('node-fetch')
const APP_ID = process.env.APP_ID
const API_TOKEN = process.env.API_TOKEN

console.log(APP_ID, API_TOKEN)
module.exports.login = async (req, res) => {
  const { userId, accessToken } = req.body
  // use user ID and acces token to verify user
  if (!userId || !accessToken) {
    res.status(400).send({ error: true, message: "User ID and access token are required!" })
    return
  }


  const sb = new SendBird({ appId: APP_ID })

  sb.connect(userId, accessToken)
    .then(async user => {
      sb.disconnect();
      // Only allow moderators to login
        console.log(user)
      if (!isModerator(user)) {
        return res.status(400).send({ error: true, message: "Unauthorized! User is not a moderator." })
      }
      // create a new session token and send to client
      const response = await fetch(`https://api-${APP_ID}.sendbird.com/v3/users/${userId}/token`, {
        method: 'POST',
        headers: { 'Api-Token': API_TOKEN },
        body: JSON.stringify({}),
      })
      if (response.status !== 200) {
        throw new Error()
      }
      const { token } = await response.json()
      res.status(200).send({ token, profileUrl: user.plainProfileUrl })
    })
    .catch(error => {
      console.log("CONNECTION ERROR:", error)
      res.status(400).send({ error: true, message: "Invalid credentials" })
    })
}

module.exports.logout = async (req, res) => {
  const { userId } = req.body
  // use user ID and access token to verify user
  if (!userId) {
    res.status(400).send({ error: true, message: "User ID is required!" })
    return
  }
  // remove all session tokens for user
  // Docs: https://sendbird.com/docs/chat/v3/platform-api/user/managing-session-tokens/revoke-all-session-tokens
  const response = await fetch(`https://api-${APP_ID}.sendbird.com/v3/users/${userId}/token`, {
    method: 'DELETE',
    headers: { 'Api-Token': API_TOKEN }
  })
  try {
    const data = await response.json()
    res.status(response.status).send(data)
  } catch (error) {
    res.status(400).send({ error: true, message: 'There was an error while logging out. Try logging in again.' })
  }
}

function isModerator(user) {
  return Boolean(user && user.metaData && user.metaData.moderator === 'true')
}
