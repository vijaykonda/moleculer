let _ = require("lodash");
let fakerator = require("fakerator")();
let Service = require("../src/service");
let { ValidationError } = require("../src/errors");
const Promise = require("bluebird");

let { delay } = require("../src/utils");

let users = fakerator.times(fakerator.entity.user, 10);

_.each(users, (user, i) => user.id = i + 1);
let c = 0;

module.exports = function(broker) {
	return new Service(broker, {
		name: "users",
		version: 2,
		latestVersion: true,
		
		actions: {
			find: {
				cache: false,
				handler(ctx) {
					//this.logger.debug("Find users...");
					return users;
					//return _.cloneDeep(users);
				}
			},

			get: {
				cache: {
					keys: ["id", "withPostCount"]
				},
				handler(ctx) {
					//this.logger.debug("Get user...", ctx.params);
					const user = _.cloneDeep(this.findByID(ctx.params.id));
					if (user && ctx.params.withPostCount)
						return ctx.call("posts.count", { id: user.id }, { timeout: 1000, /*fallbackResponse: 999*/ }).then(count => {
							user.postsCount = count;
							return user;
						});
					else
						return user;
				}
			},

			dangerous() {
				//return Promise.reject(new Error("Something went wrong!"));
				return Promise.reject(new ValidationError("Wrong params!"));
			},

			delayed(ctx) {
				c++;
				return Promise.resolve()
					.then(delay(c < 3 ? 6000 : 1000))
					.then(() => {
						return users;
					});
			},

			slowGet(ctx) {
				return Promise.delay(2000).then(() => {
					this.logger.info("slowGet called");
					const user = _.cloneDeep(this.findByID(ctx.params.id));
					if (user && ctx.params.withPostCount)
						return ctx.call("posts.count", { id: user.id }).then(count => {
							user.postsCount = count;
							return user;
						})//.catch(err => this.logger.error(err));
					else
						return user;
				});
			}
		},

		methods: {
			findByID(id) {
				return _.cloneDeep(users.find(user => user.id == id));
			}
		}
	});
};
