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
			genre = []
			for g in item.get('genres',[]):
				genre.append(g.get('display_name'))
			artist = []
			for a in item.get('artists',[]):
				artist.append(a.get('display_name'))
			scores = []
			for t in item.get('tombstone',{}).get('albums',[]):
				scores.append(t.get('rating',{}).get('rating'))
			album = []
			for al in item.get('tombstone',{}).get('albums',[]):
				album.append(t.get('album',{}).get('display_name'))
			yield {
				'id': item.get('id'),
				'published': item.get('timestamp'),
				'genres': genre,
				'artists': artist,
				'album': album,
				'score': scores,
				'best_new_music': item.get('tombstone',{}).get('bnm'),
				'best_new_reissue': item.get('tombstone',{}).get('bnr')
			}
		if data['next']:
			nextURL = data['next']
			nextIndex = nextURL.replace('http://api.pitchfork.com/api/v1/albumreviews/?limit=50&offset=', '')
			yield scrapy.Request(self.base_url % nextIndex)