
## How to Build

```sh
bundle install
bundle exec jekyll build
rm CNAME
touch CNAME
echo "elliancarlos.com.br" >> CNAME
cp CNAME _site
cp assets/* _site
```