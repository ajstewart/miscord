const log = require('npmlog')

const { createMessage } = require('../messenger')

module.exports = async message => {
  log.info('discordListener', 'Got a Discord message')
  log.silly('discordListener: message', message)

  // don't want to echo bot's messages
  if (config.discord.webhooks.has(message.author.id) || message.author.username === config.discord.client.user.username) return log.verbose('discordListener', 'Message was sent by one of Miscord\'s webhooks')

  // make sure this channel is meant for the bot
  if (!config.channels.has(message.channel.id)) return log.verbose('discordListener', 'Channel not found in bot\'s channel map')

  // copy message content to a new variable, as the cleanContent property is read-only
  var content = message.cleanContent
  log.verbose('discordListener: clean content', content)

  // parse embed into plaintext
  if (message.embeds.length > 0 && !config.messenger.ignoreEmbeds) {
    message.embeds.forEach(embed => {
      if (embed.title) content += '\n' + embed.title
      if (embed.url) content += '\n(' + embed.url + ')'
      if (embed.description) content += '\n' + embed.description
      embed.fields.forEach(field => { content += '\n\n' + field.name + '\n' + field.value })
    })
    log.verbose('discordListener: content with embed', content)
  }

  // get image url from discord embeds
  var imageUrl = (message.embeds.length > 0 ? (message.embeds[0].image ? message.embeds[0].image.url : (message.embeds[0].thumbnail ? message.embeds[0].thumbnail.url : undefined)) : undefined)

  // build message with attachments provided
  var username = message.member ? (message.member.nickname || message.author.username) : message.author.username
  log.verbose('discordListener: username', username)
  var msg = {
    body: createMessage(username, content),
    attachment: await Promise.all([imageUrl].concat(message.attachments.map(attach => attach.url)).filter(el => el).map(getStreamFromURL))
  }
  log.silly('discordListener: message', msg)
  var threads = config.channels.getThreadIDs(message.channel.id)
  log.verbose('discordListener: threads', threads)

  // send message to threads specified in the config/channel topic
  threads.forEach(threadID => {
      var thread_callback = config.messenger.client.sendMessage(msg, threadID)
      sentMessageCallback(message, config.discord.sendErrorDM, thread_callback)
  })
}

function getStreamFromURL (url) {
  return new Promise((resolve, reject) => require('https').get(url, res => resolve(res)))
}

function sentMessageCallback (message, report, err, info) {
  log.verbose('discordListener', 'Sent message on Messenger')
  if (err) {
        log.error('discordListener', err)
        if (report) message.author.sendMessage("The message you sent to "+message.channel+":\n\n"+"`"+message.content+"`"+"\n\nreturned an error and was not sent!\n\nTry sending the message again.\n\nIf problems persist contact the Server Administrator")
  } /*else {
        if (report) message.author.sendMessage("The message\n\n"+"`"+message.content+"`"+"\n\nyou sent to "+message.channel+" was sent successfully!")
        } */
  if (info) log.silly('discordListener: sent message info', info)
