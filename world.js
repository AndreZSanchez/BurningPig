var util = require('util'),
    _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    randomstring = require("randomstring"),
    Terrain = require('./terrain/terrain'),
    PacketRouter = require('./packetRouter'),
    PacketWriter = require('./network/packetWriter'),
    PacketSender = require('./network/packetSender'),
    Encryption = require('./network/encryption'),
    EntityManager = require('./EntityManager');

function World() {
    EventEmitter.call(this);
    var self = this;
    this.worldTime = new Buffer(8);
    this.worldTime.fill(0);
    this.terrain = new Terrain();
    this.packetRouter = new PacketRouter(this);
    this.encryption = new Encryption();
    this.serverId = randomstring.generate(15);
    this.encryption.init(new Buffer(this.serverId, 'ascii'));

    this.settings = require('./settings.json');

    this.packetWriter = new PacketWriter();
    this.packetSender = new PacketSender(this);
    
    this.itemEntities = new EntityManager();
    this.npcEntities = new EntityManager();
    this.playerEntities = new EntityManager();

    this.nextEntityId = 1;   

    this.registerHandlers();
};

World.prototype = Object.create(EventEmitter.prototype, { constructor: { value: World }});

World.prototype.register = function(handlerName) {
    var handler = require('./handlers/' + handlerName);
    handler(this);
    return this;
};

World.prototype.startWorld = function () {
    var self = this;

    this.timeTimer = setInterval(function () {
        self.emit('game_tick');
    }, 50);

    this.keepAliveTimer = setInterval(function () {
        self.emit('keepalive_tick');
    }, 1000);
};

World.prototype.registerHandlers = function() {
    var self = this;

    this.register('timeHandler');
    this.register('serverPingHandler');
    this.register('keepAliveHandler');
    this.register('loginHandler');
    this.register('chatHandler');
    this.register('playerLookMovementHandler');
    this.register('diggingHandler');
    this.register('buildHandler');
    this.register('inventoryHandler');
    this.register('pluginHandler');

    var packetRouterEvents = {
        use_entity: 'useEntity',
        entity_action: 'entityAction',
        close_window: 'closeWindow',
        click_window: 'clickWindow',
        confirm_transaction: 'confirmTransaction',
        creative_inventory_action: 'creativeInventoryAction',
        enchant_item: 'enchantItem',
        update_sign: 'updateSign',
        player_abilities: 'playerAbilities',
        locale_view_distance: 'localeViewDistance'
    }
    
    _(packetRouterEvents).forEach(function(fnName, eventName) {
      self.on(eventName, function(data, player) {
        self.packetRouter[fnName](data, player);
      });
    });

    self.on('disconnect', function (data, player) { self.disconnect(data,player) });
    self.on('end', function(player) { self.socketClosed(player) });
    self.on('destroy', function(player) { self.socketClosed(player) });
};


World.prototype.sendEntitiesToPlayer = function(targetPlayer) {
    targetPlayer.sendItemEntities(this.itemEntities, this.packetWriter);
    targetPlayer.sendNpcEntities(this.npcEntities, this.packetWriter);
    targetPlayer.sendPlayerEntities(this.playerEntities, this.packetWriter);
};

World.prototype.disconnect = function (data, player) {
    //Do stuff like save them to the database.

    this.playerEntities.remove(player.entityId);

    var message = { 
        translate: 'chat.type.announcement',
        using: ["Server", player.name + ' (' + player.id + ') has left the world!']
    }; 

    var leavingChat = this.packetWriter.build({ ptype: 0x03, message: JSON.stringify(message) });
    var clientlist = this.packetWriter.build({
        ptype: 0xC9, 
        playerName: player.name,
        online: false,
        ping: 0
    });

    var destroyEntity = this.packetWriter.build({
        ptype: 0x1D, 
        entityIds: [ player.entityId ]
    });

    this.packetSender.sendToAllPlayers(clientlist);
    this.packetSender.sendToAllPlayers(destroyEntity);
    this.packetSender.sendToAllPlayers(leavingChat);
};

World.prototype.socketClosed = function(player) {
    console.log('Player connection closed.');
};


module.exports = World;
