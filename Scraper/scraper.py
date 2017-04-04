import json
import scrapy

class pitchforkReviews(scrapy.Spider):
	name = 'reviews'
	base_url = 'http://pitchfork.com/api/v1/albumreviews/?limit=50&offset=%s'
	start_urls = [base_url % 0]
	download_delay = 1.5

	def parse(self, response):
		data = json.loads(response.body)
		for item in data.get('results',[]):
			yield {
				'id': item.get('id'),
				'published': item.get('timestamp'),
				'genres': item.get('genres'),
				'artists': item.get('artists',[]).get('display_name'),
				'album': item.get('title'),
				'best_new_music': item.get('tombstone',{}).get('bnm')
			}