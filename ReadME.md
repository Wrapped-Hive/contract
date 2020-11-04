Runing tests

- First install ganache-cli   
```
npm i ganache-cli
```   
- Then run ganache-cli and import/unlock account using -u -a params and -m for mnemonic so tests are deterministic and straight forward to run
```
ganache-cli --secure -u 0 -u 1 -u 2 -u 3 -u 4 -u 5 -u 6 -u 7 -u 8 -u 9 -m 'palace vendor pole coach world negativcable skirt chronic pilot engine invest'
```

- Run truffle test, if you already have truffle installed ignore the next line   
```
npm i truffle
```   
- Run test   
```
truffle test
```   

