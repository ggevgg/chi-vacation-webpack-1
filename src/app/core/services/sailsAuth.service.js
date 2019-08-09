import { USERSTORAGEKEY } from '../constants/localstorage.consts';

export default class SailsAuthService {
	constructor ($localStorage, $q, roles, $http, sailsService, API_URL) {
		'ngInject';
		this.$localStorage = $localStorage;
		this.sailsService = sailsService;
		this.$http = $http;
		this.$q = $q;
		this.roles = roles;
		this.authUser = $localStorage[ USERSTORAGEKEY ] || { status:false, data: false };
		this.baseUrl = API_URL;
	}

	checkPersmissions(arr) {
		return !!~arr.indexOf(this.authUser.role || this.roles.GUEST);
	}
	getAuthUser() {
		return this.authUser.data;
	}
	getUserState() {
		this.authUser = this.$localStorage[ USERSTORAGEKEY ] || { status:false, data: false };
		return this.authUser.status;
	}

	signInUserByUsername({username, password}) {
		let deferred = this.$q.defer();
		let userForm = JSON.stringify({
                username,
				password
        	});
			
		this.$http.post(this.baseUrl+'/auth/signin', userForm).then( 
			({data}) => {
				let {user} = data.data;
				this.authUser = {
					status: true,
					data: data.data,
					role: user.role,
					id: user.id
				};
				this.userData = data.data;
				this.$http.defaults.headers.common['Authorization'] = "Bearer " + this.userData.token;
				this.$localStorage[ USERSTORAGEKEY ] = this.authUser;
				deferred.resolve(this.authUser);
			}, 
			error => {
				deferred.reject({
					status: false,
					error: error
				});
				this.logOut();	
			});

		return deferred.promise;
	}

	logOut() {
		this.$http.post(this.baseUrl + '/auth/logout')
			this.$localStorage.$reset();
			this.authUser = {status: false, data: false}
	}

	changePassword(email, oldpassword, password) {
		return this.$http.post(this.baseUrl + '/users/changePassword', {
			email,
			oldpassword,
			password
		})
	}
	
	resetPassword(email) {
		return this.$http.post(this.baseUrl + '/users/resetPassword', {email})
	}

}