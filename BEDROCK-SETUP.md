# Bedrock Edition Setup Guide

This guide explains how to enable cross-platform play between Minecraft Java Edition and Bedrock Edition players on the festas_builds server.

## 🎮 What is Bedrock Edition Support?

With **Geyser** and **Floodgate**, your server can accept connections from:
- 📱 **Mobile** - iOS and Android
- 🎮 **Consoles** - Xbox, PlayStation, Nintendo Switch
- 💻 **Windows 10/11** - Bedrock Edition

Bedrock players can play alongside Java Edition players seamlessly!

---

## 🌐 Connection Information

### For Java Edition Players
- **Address:** `your-server-ip:25565`
- **Protocol:** TCP
- **No changes required** - connect as usual

### For Bedrock Edition Players
- **Address:** `your-server-ip`
- **Port:** `19132`
- **Protocol:** UDP
- **Authentication:** Xbox Live account

**Note:** Console players may need workarounds (see [Console Player Instructions](#console-player-instructions) below).

---

## 🔧 Server Setup

### 1. Install Geyser and Floodgate Plugins

Both plugins will be automatically installed when you run:

```bash
cd /home/deploy/minecraft-server
./install-plugins.sh
```

The script will download:
- **Geyser-Spigot** - Translates Bedrock protocol to Java protocol
- **Floodgate** - Allows Bedrock players without Java accounts

**Manual Installation (if needed):**
1. Download Geyser-Spigot: https://geysermc.org/download#geyser
2. Download Floodgate: https://geysermc.org/download#floodgate
3. Place both JAR files in `plugins/` directory
4. Restart the server: `sudo systemctl restart minecraft.service`

### 2. Configure Geyser

After first run, Geyser creates its config at `plugins/Geyser-Spigot/config.yml`.

You can use our template as a starting point:

```bash
# Copy template to Geyser config location
cp config/geyser-config.yml plugins/Geyser-Spigot/config.yml
```

**Key Configuration Options:**

Edit `plugins/Geyser-Spigot/config.yml`:

```yaml
bedrock:
  # IP address for Bedrock connections (0.0.0.0 = all interfaces)
  address: 0.0.0.0
  # Bedrock port (default: 19132)
  port: 19132
  # Server name shown in Bedrock server list
  motd1: festas_builds
  motd2: Community Server

remote:
  # Java server address (localhost since on same machine)
  address: 127.0.0.1
  # Java server port
  port: 25565
  # Use Floodgate for authentication
  auth-type: floodgate
```

### 3. Configure Floodgate

After first run, Floodgate creates its config at `plugins/floodgate/config.yml`.

You can use our template:

```bash
# Copy template to Floodgate config location
cp config/floodgate-config.yml plugins/floodgate/config.yml
```

**Key Configuration Options:**

Edit `plugins/floodgate/config.yml`:

```yaml
# Prefix for Bedrock players (to avoid username conflicts)
username-prefix: "."

# Replace spaces in Bedrock usernames
replace-spaces: true
```

**Example:** A Bedrock player named "Steve123" will appear as ".Steve123" in-game.

### 4. Open Firewall Port

**CRITICAL:** Port 19132 (UDP) must be open for Bedrock connections.

#### Ubuntu/Debian (UFW)

```bash
# Open Bedrock port
sudo ufw allow 19132/udp comment "Minecraft Bedrock"
sudo ufw reload

# Verify
sudo ufw status
```

#### CentOS/RHEL/Fedora (firewalld)

```bash
# Open Bedrock port
sudo firewall-cmd --permanent --add-port=19132/udp
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

#### iptables (direct)

```bash
# Add rule
sudo iptables -A INPUT -p udp --dport 19132 -j ACCEPT

# Save rules (Ubuntu/Debian)
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Save rules (CentOS/RHEL)
sudo service iptables save
```

#### Hetzner Cloud Firewall

If using Hetzner Cloud, also configure the firewall in the Hetzner Cloud Console:

1. Go to **Cloud Console** → **Firewalls**
2. Select your firewall or create a new one
3. Add inbound rule:
   - **Protocol:** UDP
   - **Port:** 19132
   - **Source:** Any IPv4 (`0.0.0.0/0`) and Any IPv6 (`::/0`)
4. Apply firewall to your server

**Alternative: Using hcloud CLI:**

```bash
# Create firewall rule
hcloud firewall add-rule your-firewall-name \
  --direction in \
  --protocol udp \
  --port 19132 \
  --source-ips 0.0.0.0/0 \
  --source-ips ::/0
```

### 5. Restart Server

After configuration and firewall setup:

```bash
sudo systemctl restart minecraft.service
```

### 6. Verify Geyser is Running

Check the server logs:

```bash
sudo journalctl -u minecraft.service -n 100 | grep -i geyser
```

You should see messages like:
```
[Geyser-Spigot] Started Geyser on 0.0.0.0:19132
[Geyser-Spigot] Done! Run /geyser help for help!
```

---

## 📱 How Bedrock Players Connect

### Mobile (iOS/Android)

1. Open **Minecraft** (Bedrock Edition)
2. Tap **Play**
3. Tap **Servers** tab
4. Scroll down and tap **Add Server**
5. Enter server details:
   - **Server Name:** festas_builds
   - **Server Address:** `your-server-ip`
   - **Port:** `19132`
6. Tap **Save** and join the server

**Note:** Your server will appear in the custom server list, not the featured servers.

### Windows 10/11 Bedrock Edition

1. Open **Minecraft for Windows**
2. Click **Play**
3. Click **Servers** tab
4. Scroll down and click **Add Server**
5. Enter server details:
   - **Server Name:** festas_builds
   - **Server Address:** `your-server-ip`
   - **Port:** `19132`
6. Click **Save** and join

### Console Player Instructions

**Important:** Consoles (Xbox, PlayStation, Nintendo Switch) don't allow adding custom servers directly. You need a workaround:

#### Method 1: BedrockConnect (Recommended)

BedrockConnect is a third-party solution that lets console players join custom servers:

1. **Add "Featured Server":** Add one of the featured servers to your server list (e.g., The Hive, Mineplex)
2. **Visit BedrockConnect:** Go to https://github.com/Pugmatt/BedrockConnect for instructions
3. **Use DNS Method:** Follow DNS configuration for your console
4. **Connect:** Join the featured server, and BedrockConnect will redirect you to a custom server menu

**Detailed guides:**
- Xbox: https://github.com/Pugmatt/BedrockConnect/wiki/Xbox
- PlayStation: https://github.com/Pugmatt/BedrockConnect/wiki/PlayStation
- Nintendo Switch: https://github.com/Pugmatt/BedrockConnect/wiki/Switch

#### Method 2: LAN Transfer

Some console players can transfer worlds between devices and connect via LAN.

**Note:** This method is complex and not recommended for most users.

---

## ⚙️ Configuration Tips

### Customize Bedrock MOTD

Edit `plugins/Geyser-Spigot/config.yml`:

```yaml
bedrock:
  motd1: "§6§lfestas_builds"
  motd2: "§7Cross-Platform Server §a[1.20.4]"
```

You can use Minecraft color codes (§ + color code).

### Change Bedrock Player Prefix

Edit `plugins/floodgate/config.yml`:

```yaml
# Use a different prefix (examples: "*", "~", "-", or "")
username-prefix: "*"

# Or remove prefix entirely (not recommended - may cause conflicts)
username-prefix: ""
```

**Warning:** Removing the prefix can cause username conflicts if a Java and Bedrock player share the same name.

### Link Java and Bedrock Accounts (Optional)

Geyser supports linking accounts so players can keep the same username across both editions.

**Setup Global Linking:**

1. Enable in `plugins/Geyser-Spigot/config.yml`:
   ```yaml
   command-suggestions: true
   ```

2. Players use commands:
   ```
   /linkaccount <java-username> <bedrock-username>
   ```

**Requires:** A database (MySQL/SQLite) to store linked accounts.

**See:** https://wiki.geysermc.org/geyser/global-api/ for advanced setup.

---

## 🐛 Troubleshooting

### Bedrock Players Can't Connect

**Symptoms:** "Unable to connect to world" or "Could not connect"

**Fixes:**

1. **Check firewall:**
   ```bash
   sudo ufw status | grep 19132
   # or
   sudo firewall-cmd --list-ports | grep 19132
   ```

2. **Verify Geyser is listening:**
   ```bash
   sudo netstat -tulpn | grep 19132
   # or
   sudo ss -tulpn | grep 19132
   ```

3. **Check server logs:**
   ```bash
   sudo journalctl -u minecraft.service | grep -i geyser
   ```

4. **Test locally:**
   ```bash
   # From the server itself
   nc -zvu localhost 19132
   ```

5. **Check Hetzner Cloud Firewall:** Ensure UDP port 19132 is open in the web console.

### Bedrock Players Have Wrong Prefix

**Problem:** Players appear with wrong prefix or no prefix

**Fix:** Edit `plugins/floodgate/config.yml`:

```yaml
username-prefix: "."
```

Then restart:
```bash
sudo systemctl restart minecraft.service
```

### Connection Timeout

**Symptoms:** Connection times out after a few seconds

**Fixes:**

1. **Verify Geyser is running:**
   ```bash
   sudo journalctl -u minecraft.service | grep "Started Geyser"
   ```

2. **Check configuration:**
   ```bash
   cat plugins/Geyser-Spigot/config.yml | grep -A 5 "bedrock:"
   ```

3. **Restart Geyser:**
   ```bash
   # In Minecraft console (or via RCON)
   /geyser reload
   ```

### "Unable to Connect to World"

**This is almost always a firewall issue.**

**Diagnosis:**

1. **Test port from outside:**
   ```bash
   # From your local computer (not the server)
   nc -zvu your-server-ip 19132
   ```

2. **Check ALL firewalls:**
   - Server OS firewall (ufw, firewalld, iptables)
   - Hetzner Cloud Firewall (web console)
   - Home router firewall (if testing from home)

3. **Verify correct IP:**
   ```bash
   # On server, check public IP
   curl ifconfig.me
   ```

### Java Players Can't See Bedrock Players (or vice versa)

**Problem:** Players on different editions can't see each other

**Causes:**
- Floodgate not installed
- Geyser not configured with `auth-type: floodgate`
- Plugin load order issue

**Fix:**

1. **Verify both plugins loaded:**
   ```bash
   # In Minecraft console
   /plugins
   ```

2. **Check Geyser config:**
   ```bash
   cat plugins/Geyser-Spigot/config.yml | grep auth-type
   ```
   Should show: `auth-type: floodgate`

3. **Restart server:**
   ```bash
   sudo systemctl restart minecraft.service
   ```

### Bedrock Player Names Conflict with Java Players

**Problem:** Player "Steve" on Java blocks "Steve" on Bedrock

**Solution:** This is why we use a prefix! Ensure Floodgate is configured:

```yaml
username-prefix: "."
```

Now Bedrock Steve becomes ".Steve" and Java Steve stays "Steve".

### Performance Issues After Adding Geyser

**Problem:** Server lags with Bedrock players online

**Causes:**
- Bedrock protocol translation is CPU-intensive
- Too many Bedrock players for server resources

**Fixes:**

1. **Increase server RAM** (in `config.sh`):
   ```bash
   MIN_RAM="4G"
   MAX_RAM="6G"
   ```

2. **Limit Bedrock player count** in `plugins/Geyser-Spigot/config.yml`:
   ```yaml
   max-players: 20
   ```

3. **Use Paper optimizations** (already included in this server setup)

4. **Monitor with spark:**
   ```bash
   # Install spark plugin
   /spark profiler start
   ```

---

## 📊 Testing Checklist

After setup, verify everything works:

- [ ] Geyser plugin loaded (`/plugins` shows Geyser-Spigot)
- [ ] Floodgate plugin loaded (`/plugins` shows floodgate)
- [ ] Port 19132 UDP is open (test with `nc -zvu your-ip 19132`)
- [ ] Java player can connect on port 25565
- [ ] Bedrock player can connect on port 19132
- [ ] Both players can see each other in-game
- [ ] Bedrock players have correct prefix (e.g., ".PlayerName")
- [ ] Chat works between Java and Bedrock players
- [ ] Commands work for Bedrock players

---

## 🔗 Additional Resources

- **Geyser Official Wiki:** https://wiki.geysermc.org/geyser/
- **Floodgate Documentation:** https://wiki.geysermc.org/floodgate/
- **Geyser Discord:** https://discord.gg/geysermc
- **BedrockConnect (Console):** https://github.com/Pugmatt/BedrockConnect
- **GeyserMC GitHub:** https://github.com/GeyserMC

---

## 🎯 Quick Reference

### Important Files

| File | Purpose |
|------|---------|
| `plugins/Geyser-Spigot/config.yml` | Geyser configuration |
| `plugins/floodgate/config.yml` | Floodgate configuration |
| `config/geyser-config.yml` | Template for Geyser config |
| `config/floodgate-config.yml` | Template for Floodgate config |

### Useful Commands

| Command | Purpose |
|---------|---------|
| `/geyser help` | Show Geyser commands |
| `/geyser version` | Show Geyser version |
| `/geyser reload` | Reload Geyser config |
| `/geyser list` | List connected Bedrock players |
| `/floodgate reload` | Reload Floodgate config |

### Ports Reference

| Edition | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Java | 25565 | TCP | Java Edition connections |
| Bedrock | 19132 | UDP | Bedrock Edition connections |

---

**Need help?** Check the [Troubleshooting](#troubleshooting) section or visit the [Geyser Discord](https://discord.gg/geysermc)!

---

*Built with ❤️ for the festas_builds community*
