function LoginController ($log, $state, $scope, toastr, states, sailsAuthService, sailsService, $rootScope) {
  'ngInject';

  $scope.sending = false;
  $scope.signin = signin;
  $scope.states = states;
  $scope.passwordPattern = '.{1,}';
  //$scope.resetPassword = resetPassword;
  $scope.changePassword = changePassword;

  function signin () {
    if($scope.authForm.$invalid) {
      toastr.warning('Fieldes hasn\'t be empty!');
      return
    }
    $scope.sending = true;
    sailsAuthService.signInUserByUsername({
      username: $scope.username,
      password: $scope.passw || $scope.newPassword
    }).then( (user) => {
      if ($rootScope.prevState && 
        user && 
         (user.role === states.ADMIN || 
          user.role === states.MANAGER || 
          user.role === states.TEAMLEAD) ) {
            $state.go(user.role, $rootScope.prevParams);
      } else {
        $state.go(states.HOME);
      }
    }).catch( err => {
      toastr.error(err.error.data.message, 'Error');
      $log.error(err);
      $scope.sending = false;
    });
  }

/*  function resetPassword () {
    if($scope.resetPasswordForm.$invalid) {
      toastr.warning('Fieldes hasn\'t be empty!');
      return
    }
    $scope.sending = true;
    sailsAuthService.resetPassword($scope.email)
    .then( () => {
      toastr.success('Check your email!');
      $state.go(states.LOGIN);
    }).catch( err => {
      debugger;
      toastr.error(err.error.message, err.error.code);
      $log.error(err);
      $scope.sending = false;
    });
  }*/

   function changePassword () {
    if ($scope.newPassword !== $scope.newPassword2) {
      toastr.error('Entered passwords are different!', 'Error');
      return
    }
    if ($scope.authForm.$valid) {
      $scope.sending = true;
      sailsAuthService.changePassword($scope.email, $scope.oldPassword, $scope.newPassword)
        .then(
          () => { 
            toastr.success('Password changed success!', 'Success');
            signin();
          }          
        )
        .catch(
        error => {
            $scope.sending = false;
            toastr.error(error.data.data.raw.message, 'Error changing password!');
          });
      } else {
      toastr.error('Not all fields are filled', 'Error');
    }
  }  

}

export default LoginController;