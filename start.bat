@echo off

:: The name of the item that should be hidden
set ITEM_NAME=RTMP
:: The Twitch channel to look for
set CHANNEL=1kentora
:: Timeout before allowed invocations
set TIMEOUT=30000
:: Command to listen for
set COMMAND=!flush

node index.js