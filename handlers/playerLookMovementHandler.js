var PlayerLookMovementHandler = function(world) {

    world.on("player_base", function(data, player) {
        player.updatePosition(data);
    });

    world.on("player_position", function(data, player) {
        var goodUpdate = player.updatePosition(data);
        if (goodUpdate) {
            var position = player.getAbsoluteDelta();
            var update = world.packetWriter.build({
                ptype: 0x1F, 
                entityId: player.entityId,
                dX: position.x,
                dY: position.y,
                dZ: position.z,
            });
            world.packetSender.sendToOtherPlayers(update, player);
            player.checkForPickups(world.itemEntities, world.packetWriter);
        }
    });

    world.on("player_look", function(data, player) {
        var goodUpdate = player.updatePosition(data);
        if (goodUpdate) {
            var position = player.getAbsoluteDelta();
            var update = world.packetWriter.build({
                ptype: 0x20, 
                entityId: player.entityId,
                yaw: position.yaw,
                pitch: position.pitch,
            });

            var headLook = world.packetWriter.build({
                ptype: 0x23, 
                entityId: player.entityId,
                headYaw: position.yaw,
            });

            world.packetSender.sendToOtherPlayers(Buffer.concat([update, headLook], update.length+headLook.length), player);
        }
    });

    world.on("player_position_look", function(data, player) {
        var goodUpdate = player.updatePosition(data);

        if (goodUpdate) {
            var position = player.getAbsoluteDelta();
            var update = world.packetWriter.build({
                ptype: 0x21, 
                entityId: player.entityId,
                dX: position.x,
                dY: position.y,
                dZ: position.z,
                yaw: position.yaw,
                pitch: position.pitch,
            });
            world.packetSender.sendToOtherPlayers(update, player);
            player.checkForPickups(world.itemEntities, world.packetWriter);
        }
    });
};

module.exports = PlayerLookMovementHandler;