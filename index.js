//require discord api
const discord = require("discord.js");
const client = new discord.Client();
//require config and user info
var config = require("./config.json");
var userInfo = require("./user.json");
//require other lib
const fs = require("fs");

//Emits when the client joins a new guild
client.on("guildCreate",guild=>{
    //saves the id and defulte prefix
    var newGuildId = {
        guildID: guild.id,
        prefix:"?"
    }
    config.guilds.push(newGuildId)
    //saves the info to config
    fs.writeFile("./config.json",JSON.stringify(config),'utf8',(err)=>{
        if(err) console.log(err)
    })
})
//console logs when the bot turns on
client.on("ready",()=>console.log("The bot is on"));
//Checks for messeages in all guilds. 
client.on("message", async msg=>{
    //returns all the bots messages.
    if(msg.author.bot|| msg.channel.type == "dm") return;
    var theI;
    //for loop that finds the guilds postion in the guild list
    for(var i = 0 ; i < config.guilds.length; i++){
        if(msg.guild.id == config.guilds[i].guildID){
            theI = i;
        }
    }
    //cheks if the command starts with the prefix, other wise returns
    if(!msg.content.startsWith(config.guilds[theI].prefix)) return;
    //splices up the messege
    const args = msg.content.slice(config.guilds[theI].prefix.length).split(' ');

    //          Commands

    //Setprefix command.
    if(args[0] == "setprefix"){
        //if second potions in the chat is empty send this
        if(args[1] == undefined){
            msg.channel.send(`${config.guilds[theI].prefix}setprefix {newprefix}`);
            return;
        }
        //Changes the prefix for the guild and uppdates the config
        msg.channel.send(`Chaning the prefix from ${config.guilds[theI].prefix} to ${args[1]}`);
        config.guilds[theI].prefix = args[1];
        fs.writeFile("./config.json",JSON.stringify(config),'utf8',(err)=>{
            if(err) console.log(err)
        })
    }
    //starts the game
    if(args[0] == "startgame")
    {
        //chekes if the users has a game alredy
        if(hasGame(msg.author.id)){
            msg.channel.send("You alredy have a game. Continue with that game");
            return;
        }
        else{
            //sends info to user about the game
            msg.author.createDM().then(dm=>{
                dm.send("welcome to the down game. To start react with the sword").then(react=>{
                    
                    //creates a user to json file. To understand more go to the startgame function
                    startGame(msg.author.id,msg.guild.id,react.id);
                    //reacts with swords so its esay for the user to do it. The reactions is getting read on "on.client("messageReactionAdd")"
                    react.react("⚔️");
                })
            })
        }
    }
    //a comand that resets ur game
    if(args[0] == "reset"){
        for(var i = 0 ; i < userInfo.users.length; i++){
            if(userInfo.users[i].id == msg.author.id){
                //rewrie and finde a way
                msg.author.createDM().then(dm=>{
                    if(userInfo.users[i].reactMsgID != undefined){
                        dm.messages.cache.get(userInfo.users[i].reactMsgID).delete();
                    }
                })
                userInfo.users.splice(i, 1)
                uppdateUserJSONfile()
                msg.channel.send("Remove ur game")
                return;
            }
        }
        msg.channel.send("you don't have an active game")
        return;
    }
    //reload the game. You need to use this command to get the reactions work when u stop the bot
    if(args[0] == "reload")
    {
       for(var i = 0 ; i < userInfo.users.length; i++){
           console.log("yes 1")
            if(userInfo.users[i].id == msg.author.id){
                console.log("yes 2")
                if(userInfo.users[i].reactMsgID != undefined){
                    console.log("yes 3")
                    await msg.author.createDM().then(async dm =>{
                        var sendDm="";
                        if(userInfo.users[i].roomNow.exits == 1){
                            sendDm += `**You enter the next room**. You are in a open room with ${userInfo.users[i].roomNow.exits} exit.\n`
                        }
                        else{
                            sendDm += `**You enter the next room.** You are in a open room with ${userInfo.users[i].roomNow.exits} exits.\nThe exits are\n`
                        }
                        for(var y = 0; y < userInfo.users[i].roomNow.exits; y++){
                            sendDm +=`-${userInfo.users[i].roomNow.dirs[y]}\n`;
                        }
                        //Cheks if it did spawn in a chest in the randommizer. If did tell the player here
                        if(userInfo.users[i].roomNow.chest.spawn == true){
                            sendDm += `**There is a chest in the middle of the room. Do you want to open it** ?\n`
                        }
                        else{
                            sendDm += `You don't see anything else special\n`
                        }
                        //sends reactios to the next rooms. They are goind to be cheked so the users can keep playing
                        await dm.send( sendDm+"To leave the room react with were you want to go").then(react =>{ 
                            userInfo.users[i].reactMsgID = react.id;
                            for(var y = 0; y < userInfo.users[i].roomNow.exits; y++){
                                if(userInfo.users[i].roomNow.dirs[y] == "Left"){
                                    react.react("⬅️");
                                }
                                if(userInfo.users[i].roomNow.dirs[y] == "Right"){
                                    react.react("➡️");
                                }
                                if(userInfo.users[i].roomNow.dirs[y] == "Forward"){
                                    react.react("⬆️");
                                }
                                if(userInfo.users[i].roomNow.dirs[y] == "Down"){
                                    userInfo.users[i].gameStats.level += 1;
                                    userInfo.users[i].gameStats.xp += getRndInteger(1,10);
                                    react.react("⬇️");

                                }
                                //The emoji for chest for now
                                if(userInfo.users[i].roomNow.chest.spawn == true){
                                    react.react("📫");
                                }
                            }
                        })
                    })
                }
                
            }
       }
    }
    
})
//reads the reactions over all guilds. Is used to play the actions the user makes 
client.on("messageReactionAdd", async (reaction, user) =>{
    if(reaction.partial){
        try{
            await reaction.fetch();
        }
        catch(err){
            console.log(err);
            return;
        }
    }
    //first reaction type. The first. No mobs and just a room with random dirs. This one is only importen for the first start
    if(reaction.emoji.name == "⚔️")
    {
        //chekks so its only dm and users
        if(reaction.message.channel.type = "dm" && !user.bot)
        {
            //finds the user with the for loop
            for(var i = 0 ; i <userInfo.users.length;i++){
                if(userInfo.users[i].id == user.id && userInfo.users[i].accepted == false){
                    //cheks so its the right message the user is reacting on
                    console.log(userInfo.users[i].reactMsgID)
                    console.log(i)
                    if(userInfo.users[i].reactMsgID == reaction.message.id){
                        userInfo.users[i].accepted = true;
                        //generats room. Go to function for more info
                        var room = generateRoom(0);
                        //saves the active room to the user
                        userInfo.users[i].roomNow = room;
                        uppdateUserJSONfile()
                        //sends info to the user about the room
                        await user.createDM().then( async dm=>{
                            var sendDm = "";
                            if(room.exits == 1){
                                sendDm += `**You enter the Dungeon**. \nYou are in a open room with ${room.exits} exit.\n`
                            }
                            else{
                                sendDm += `**You enter the Dungeon**. You are in a open room with ${room.exits} exits.\nThe exits are\n`
                            }
                            for(var y = 0; y < room.exits; y++){
                                sendDm += `-${room.dirs[y]}\n`
                            }
                            //sends reactios to the next rooms. They are goind to be cheked so the users can keep playing
                            sendDm +=`You don't see anything else special\nTo leave the room react with were you want to go`
                            await dm.send( sendDm ).then(react =>{
                                console.log(userInfo.users[i].reactMsgID)
                                reaction.message.delete();
                                userInfo.users[i].reactMsgID = react.id;
                                for(var y = 0; y < room.exits; y++){
                                    if(room.dirs[y] == "Left"){
                                        react.react("⬅️");
                                    }
                                    if(room.dirs[y] == "Right"){
                                        react.react("➡️");
                                    }
                                    if(room.dirs[y] == "Forward"){
                                        react.react("⬆️");
                                    }
                                    if(room.dirs[y] == "Down"){
                                        react.react("⬇️");
                                    }
                                }
                            })
                        })
                    }
                }
            }
        }
    }
    //this is the same thing as above but its after the first time were it can't spawn mobs. Comments on whats difrent
    if(reaction.emoji.name == "⬅️" || reaction.emoji.name == "➡️"|| reaction.emoji.name == "⬆️"|| reaction.emoji.name == "⬇️" )
    {
        if(reaction.message.channel.type = "dm" && !user.bot)
        {
            for(var i = 0 ; i <userInfo.users.length;i++)
            {

                if(userInfo.users[i].reactMsgID == reaction.message.id && userInfo.users[i].id == user.id){
                    console.log(i);
                    var room = generateRoom(20, i);
                    userInfo.users[i].roomNow = room;
                    uppdateUserJSONfile()
                    await user.createDM().then(async dm=>{
                        await reaction.message.delete();
                        var sendDm = "";
                        //if a mob attacks the player. This will stop them from continuing
                        if(room.mobs.length > 0){
                            //code for atack is on a other place. |flee not done|.
                            await dm.send(`a ${room.mobs[0].name} stands infrot of you. What do you do?\nAtack or flee`).then(react =>{
                                userInfo.users[i].reactMsgID = react.id;
                                react.react("⚔️");
                                react.react("🏃");
                            })
                        }
                        else{
                            if(room.exits == 1){
                                sendDm = `**You enter the next room**. You are in a open room with ${room.exits} exit.\n`
                            }
                            else{
                                sendDm = `**You enter the next room.** You are in a open room with ${room.exits} exits.\nThe exits are\n`
                            }
                            for(var y = 0; y < room.exits; y++){
                                sendDm +=`-${room.dirs[y]}\n`;
                            }
                            console.log(room);
                            //Cheks if it did spawn in a chest in the randommizer. If did tell the player here
                            if(room.chest.spawn == true){
                                sendDm += `**There is a chest in the middle of the room. Do you want to open it** ?\n`
                            }
                            else{
                                sendDm += `You don't see anything else special\n`
                            }
                            //sends reactios to the next rooms. They are goind to be cheked so the users can keep playing
                            await dm.send( sendDm+"To leave the room react with were you want to go").then(async react =>{ 
                                userInfo.users[i].reactMsgID = react.id;
                                for(var y = 0; y < room.exits; y++){
                                    if(room.dirs[y] == "Left"){
                                        removeMes(i)
                                        await react.react("⬅️");
                                    }
                                    if(room.dirs[y] == "Right"){
                                        removeMes(i)
                                        await react.react("➡️");
                                    }
                                    if(room.dirs[y] == "Forward"){
                                        removeMes(i)
                                        await react.react("⬆️");
                                    }
                                    if(room.dirs[y] == "Down"){
                                        removeMes(i)
                                        userInfo.users[i].gameStats.level += 1;
                                        userInfo.users[i].gameStats.xp += getRndInteger(1,10);
                                        await react.react("⬇️");
     
                                    }
                                    //The emoji for chest for now
                                    if(room.chest.spawn == true){
                                        await react.react("📫");
                                    }
                                }
                            })
                        }
                    })
                }
            }
        }
    }
    //chest code
    if(reaction.emoji.name == "📫"){
        if(reaction.message.channel.type = "dm" && !user.bot){
            for(var i = 0 ; i <userInfo.users.length;i++){
                if(userInfo.users[i].reactMsgID == reaction.message.id && userInfo.users[i].id == user.id){
                    if(userInfo.users[i].roomNow.chest.spawn == true){
                        //give the money from the chest. Random the code for random down at the funcitons 
                        await user.createDM().then(async dm=>{
                            userInfo.users[i].gameStats.gold += userInfo.users[i].roomNow.chest.gold;
                            await dm.send("You found " + userInfo.users[i].roomNow.chest.gold + " in the chest\n You now have " + userInfo.users[i].gameStats.gold +" gold").then( mes => mes.delete({timeout:1000 * 15}) );
                            userInfo.users[i].roomNow.chest.spawn = false;
                        })
                    }
                }
            }
        }
    }
    //start for atack mode. Gos truh this code evry time when atacing
    if(reaction.emoji.name == "⚔️" || reaction.emoji.name == "🛡️")
    {
        if(reaction.message.channel.type = "dm" && !user.bot)
        {
            for(var i = 0 ; i <userInfo.users.length;i++)
            {
                if(userInfo.users[i].reactMsgID == reaction.message.id && userInfo.users[i].id == user.id)
                {
                    if(userInfo.users[i].roomNow.mobs.length != undefined)
                    {
                        await user.createDM().then( async dm=>{
                            //gengerts stats for mob
                            var sendMes = "";
                            if(userInfo.users[i].roomNow.mobs[0].name == "zombie" && userInfo.users[i].roomNow.mobs[0].isLodded == false){
                                //more about this function further down in the code
                                userInfo.users[i].roomNow.mobs[0] = generateStatsMob("zombie",i);
                                console.log(userInfo.users[i].roomNow.mobs[0]);
                            }
                            else{
                                userInfo.users[i].gameStats.energie += 1;
                                if(reaction.emoji.name == "⚔️"){
                                    // energy system. Cheks if the user has engufe of it.
                                    if(userInfo.users[i].gameStats.energie <= 0){
                                        sendMes +=`You don't have enough energy to attack. \nTry protecting yourself to get more energy\n`;
                                    }
                                    else{
                                        //chanse to crit
                                        if(getRndInteger(0,userInfo.users[i].gameStats.critchans) == 5){
                                            sendMes +=`You attacked the monster, and you got a crit bonus\n`;
                                            userInfo.users[i].roomNow.mobs[0].hp -= atcdmg(i) * 2; 
                                        }
                                        else{
                                            sendMes +=`You attacked the monster\n`;
                                            userInfo.users[i].roomNow.mobs[0].hp -= atcdmg(i);
                                        }
                                        userInfo.users[i].gameStats.energie -= 2;
                                    }
                                    //if the players kills the mob
                                    if(userInfo.users[i].roomNow.mobs[0].hp <= 0 ){
                                        sendMes +=`you killed the monster\n`;
                                        userInfo.users[i].gameStats.xp += genRndXP(i);
                                        sendMes += `The monster had \n`
                                        if(userInfo.users[i].roomNow.mobs[0].iv.length != undefined){
                                            for(var y = 0 ; y <userInfo.users[i].roomNow.mobs[0].iv.length;y++){
                                                userInfo.users[i].inv.push(userInfo.users[i].roomNow.mobs[0].iv[y]);
                                                sendMes += `-${userInfo.users[i].roomNow.mobs[0].iv[y].name}\n`
                                            }
                                            sendMes += `you picked up the items\n\n`;
                                        }
                                        if(userInfo.users[i].roomNow.exits == 1){
                                            sendMes += `**You enter the next room**. You are in a open room with ${userInfo.users[i].roomNow.exits} exit.\n`
                                        }
                                        else{
                                            sendMes += `**You enter the next room.** You are in a open room with ${userInfo.users[i].roomNow.exits} exits.\nThe exits are\n`
                                        }
                                        for(var y = 0; y < userInfo.users[i].roomNow.exits; y++){
                                            sendMes +=`-${userInfo.users[i].roomNow.dirs[y]}\n`;
                                        }
                                        //Cheks if it did spawn in a chest in the randommizer. If did tell the player here
                                        if(userInfo.users[i].roomNow.chest.spawn == true){
                                            sendMes += `**There is a chest in the middle of the room. Do you want to open it** ?\n`
                                        }
                                        else{
                                            sendMes += `You don't see anything else special\n`
                                        }
                                        //sends reactios to the next rooms. They are goind to be cheked so the users can keep playing
                                        await dm.send( sendMes+"To leave the room react with were you want to go").then(async react =>{ 
                                            await reaction.message.delete();
                                            userInfo.users[i].reactMsgID = react.id;
                                            for(var y = 0; y < userInfo.users[i].roomNow.exits; y++){
                                                if(userInfo.users[i].roomNow.dirs[y] == "Left"){
                                                    removeMes(i)
                                                    react.react("⬅️");
                                                }
                                                if(userInfo.users[i].roomNow.dirs[y] == "Right"){
                                                    removeMes(i)
                                                    react.react("➡️");
                                                }
                                                if(userInfo.users[i].roomNow.dirs[y] == "Forward"){
                                                    removeMes(i)
                                                    react.react("⬆️");
                                                }
                                                if(userInfo.users[i].roomNow.dirs[y] == "Down"){
                                                    removeMes(i)
                                                    userInfo.users[i].gameStats.level += 1;
                                                    userInfo.users[i].gameStats.xp += getRndInteger(1,10);
                                                    react.react("⬇️");
                
                                                }
                                                //The emoji for chest for now
                                                if(userInfo.users[i].roomNow.chest.spawn == true){
                                                    react.react("📫");
                                                }
                                            }
                                        })


                                    }
                                }
                                else if(reaction.emoji.name == "🛡️"){
                                    userInfo.users[i].gameStats.energie += 1;
                                    sendMes +=`You tryed protected your self agenst the monster\n`
                                }
                            }
                            if(userInfo.users[i].roomNow.mobs[0].hp > 0){
                            //info about atack round
                            sendMes += "You can do one move each round\n";
                            sendMes+=`__**Stats**__\n-HP:${userInfo.users[i].gameStats.hp}\n-equpied:${userInfo.users[i].gameStats.weapon.name}\n-energy:${userInfo.users[i].gameStats.energie}\n\n`;
                            sendMes+=`__**Monsters Stats**__\n-HP:${userInfo.users[i].roomNow.mobs[0].hp}\n`
                            sendMes+=`You can try to protect yourself with 🛡️\nOr you can attack with ⚔️`
                            await dm.send(sendMes).then(react=>{
                                userInfo.users[i].reactMsgID = react.id;
                                reaction.message.delete();
                                react.react("⚔️")
                                react.react("🛡️")
                            })
                            }
                        })
                    }
                }
            }
        }
    }
})

//remove this function
function removeMes(iuser)
{
    if(userInfo.users[iuser].ivMes != ""){
        console.log(userInfo.users[iuser].ivMes +" " + userInfo.users[iuser].id)
        console.log(client.users.cache.get(userInfo.users[iuser].id).dmChannel.messages)
        client.users.cache.get(userInfo.users[iuser].id).dmChannel.messages.fetch(userInfo.users[iuser].ivMes).then(mes => mes.delete())
        userInfo.users[iuser].ivMes = "";
    }
}   

//generets rnd xp ?
function genRndXP(iuser){
    return userInfo.users[iuser].roomNow.mobs[0].xp;
}


//attack dmg for the user
function atcdmg(iuser){
    return getRndInteger(Math.round(userInfo.users[iuser].gameStats.weapon.dmg/2),userInfo.users[iuser].gameStats.weapon.dmg);
}

//function that generete stats for the mob
function generateStatsMob(mobtype, iuser)
{
    //zombie gen 
    if(mobtype == "zombie")
    {
        //xp generated and than multiplide for the player. So you can get harder and esayer mobs
        //needs to be halfly fixed
        var randomXpZombie =  Math.round((getRndInteger(2,4) * (userInfo.users[iuser].gameStats.xp + getRndInteger(2,6)))/getRndInteger(2,4)); 
        var zombie = {
            xp: randomXpZombie,
            hp: randomXpZombie * getRndInteger(1 , 4) ,
            damageOutPut: getRndInteger(1 , 5) * randomXpZombie,
            name:"zombie",
            //generets a random inv
            iv: randomGeneratedInv(randomXpZombie, iuser),
            isLodded:true
        }
        return zombie;
    }
}
//function for gen items for a mob. it takes items from a drop list in user.json. 

//**THIS FUNCTION NEEDS TO BE REWRITEN, IT DOSEN'T WORK**
function randomGeneratedInv(xp, iuser)
{
    var betwenxp =  xp - userInfo.users[iuser].gameStats.xp;
    var itemrarety = getRndInteger(0,betwenxp);
    var inv = [];
    for(var i =  0 ; i < userInfo.drops.length; i++){
        if(itemrarety >= userInfo.drops[i].rareity){
            inv.push(userInfo.drops[i]);
            return inv;
        }
    }
    inv.push(" ");
    return inv;
}

//function that uppdates the JSON user file
function uppdateUserJSONfile(){
    fs.writeFile("./user.json",JSON.stringify(userInfo),'utf8',(err)=>{
        if(err) console.log(err)
    })
}

function startGame(id, guildid, reactid){
    //creates a user
    var user = {
        id:id,
        userGuild:guildid,
        gameOn:true,
        accepted:false,
        reactMsgID:reactid,
        roomNow:{},
        inv:[],
        ivMes:"",
        chestMes:"",
        gameStats: baseStats()
    }
    //saves the user info in a json file 
    userInfo.users.push(user);
    fs.writeFile("./user.json",JSON.stringify(userInfo),'utf8',(err)=>{
        if(err) console.log(err)
    })
}
//cheks if the player has a game trund on
function hasGame(id){
    for(var i = 0 ; i < userInfo.users.length; i++){
        if(id == userInfo.users[i].id){
            if(userInfo.users[i].gameOn == true){
                return true
            }
        }
    }
    return false
}

function baseStats()
{
    //finds the base stats. Its saved in user json.
    return {
        hp:userInfo.basestats.hp,
        weapon:userInfo.basestats.weapon,
        critchans:userInfo.basestats.crit,
        energie:10,
        level:1,
        xp:0,
        floor:1,
        gold:0
    }
}
function generateRoom(mobChance, iuser)
{
    //function that genereats a room with a few dirs and maby mobs.
    var room = {
        dirs:[],
        mobs:[],
        chest:{
            spawn:false,
            gold:0
        },
        exits:0
    }
    //random exits and than random if its a left, right, forward or down. 
    var exits = getRndInteger(1,4);
    room.exits = exits;
    for(var i = 0 ; i < exits; i++){
        var dir = getRndInteger(1,4);
        if(dir == 1){
            if(ifDirExist(room, "Left") == false){
                room.dirs.push("Left");
            }
            else{
                room.exits -= 1;
            }
        }
        if(dir == 2){
            if(ifDirExist(room, "Right") == false){
                room.dirs.push("Right");
            }
            else{
                room.exits -= 1;
            }
        }
        if(dir == 3){
            if(ifDirExist(room, "Forward") == false){
                room.dirs.push("Forward");
            }
            else{
                room.exits -= 1;
            }
        }
        if(dir == 4){
            if(ifDirExist(room, "Down") == false){
                room.dirs.push("Down");
            }
            else{
                room.exits -= 1;
            }
        }
    }
    var mobspawn = getRndInteger(0,100);
    if(mobspawn > 100 - mobChance){
        //zombie floors
        if(userInfo.users[iuser].gameStats.floor >= 1)
        {
            var mob = {
                name:"zombie",
                isLodded:false
            }
            room.mobs.push(mob)
        }
    }
    //chest spawning. 0 , 100 gold. Fix so its loking more at the player xp.
    var chestspawn = getRndInteger(0,100);
    if(chestspawn > 75){
        var newchest = {
            spawn:true,
            gold: getRndInteger(0,100)
        }
        room.chest = newchest
    }
    return room;
}
//Just used in the generated room function to not make multipul of one dir
function ifDirExist(room, dir){
    for(var i = 0 ; i < room.dirs.length; i++){
        if(dir == room.dirs[i]){
            return true;
        }
    }
    return false
}
//copied random funciton from w3
function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}
//logs in the client with the token.
client.login(config.token);