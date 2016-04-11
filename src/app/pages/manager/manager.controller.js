import { find } from 'lodash';

export default class ManagerController {
  constructor ($scope, $timeout, firebaseService, userList, $uibModal, moment, groups, status, toastr) {
    'ngInject';

    this.firebaseService = firebaseService;
    this.toastr = toastr;
    this.users = userList;
    this.groups = groups;
    this.status = status;
    this.filter = {};
    this.filtredUser;
    this.statusFilter = { status: status.INPROGRESS };
    this.groupFilter = {};
    this.modal = $uibModal;
    this.pageState = "vacations";
    let today = new Date();
    today = today.setHours(0,0,0,0);
    this.order = 'startDate';
    this.oneThing = userList[0];
    this.awesomeThings = userList;
    this.userName = [];
    this.events = [];
    this.newEvent = {};
    this.selected = "sds";
    this.calendarView = 'month';
    this.calendarDay = new Date(today);
    this.newEvent.startsAt = new Date(today); 
    this.newEvent.endsAt = new Date(today);
    this.setDateInfo();

this.columnDefs = [
          { name:'firstName', field: 'firstName'},
          { name:'lastName', field: 'lastName' },
          { name:'startDate', field: 'startDate', type: 'date'},
          { name:'endDate', field: 'endDate', type: 'date'}
        ]
  }

    calcNewVacations(group) {
     var sum = 0;
     this.users.forEach(item => {
      if(item.group == group) {
        angular.forEach(item.vacations.list, el => {
          if(el.status == this.status.INPROGRESS) {
            sum++;
          }
        })
      }
     })
     return sum; 
    }
    confirmVacation(user, id) {
     var vacation = find(user.vacations.list, { id: id });
     if(user.vacations.total >= moment().isoWeekdayCalc(vacation.startDate,vacation.endDate,[1,2,3,4,5])){
     vacation.status = this.status.CONFIRMED;
      user.vacations.total -= moment().isoWeekdayCalc(vacation.startDate,vacation.endDate,[1,2,3,4,5]);
      this.firebaseService.updateUserData(user).then(
        () => this.toastr.success('Vacation confirmed', 'Success'),
        error => this.toastr.error(error.error.message, 'Error confirming vacation')
        );
     } else {
      this.toastr.error( 'Out of vacation days')
     }
    }
    
    rejectVacation(user, id) {
     var vacation = find(user.vacations.list, { id: id });
      if(vacation.status == this.status.CONFIRMED){
        user.vacations.total += moment().isoWeekdayCalc(vacation.startDate,vacation.endDate,[1,2,3,4,5]);
      }
     find(user.vacations.list, { id: id }).status = this.status.REJECTED;
      this.firebaseService.updateUserData(user).then(
        () => this.toastr.success('Vacation rejected', 'Success'),
        error => this.toastr.error(error.error.message, 'Error rejecting vacation')
        );
    }

    choiceGroup(group) {
      this.filter = { group: group };
      this.groupFilter = { group: group };
      this.setDateInfo();
    }

    choiceUser(uid, group, user) {
      this.filter = { uid: uid, group:group };
      this.groupFilter = { group: group };
      this.filtredUser = user;
      this.setDateInfo();
    }

    choiceButtonFilter(filter) {
      this.statusFilter.status = filter;
      this.setDateInfo();
    }

    openNewUserForm() {
      this.modal.open({
        templateUrl: require('!!file!./modal/addNewUser/newUserForm.html'),
        controller: require('./modal/addNewUser/addNewUser.controller'),
        controllerAs: 'user'
      });
    }

    userInfo(user) {
      this.modal.open({
        templateUrl: require('!!file!./modal/userInfo/userInfo.html'),
        controller: require('./modal/userInfo/userInfo.controller'),
        controllerAs: 'info',
        resolve: {
          user: user
        }
      });
    }

    isRepeated(obj) {
      for (var i in obj) {
        return false;
      }
      return true;
    }
    
    changePageState(state) {
      this.pageState = state;
    }
    
    setDateInfo() {
      let that = this;
      var events = this.events = [];
      var {startsAt, endsAt} = this.newEvent;
      angular.forEach(this.awesomeThings, function (value) {
        var user = value;
        if ( ('list' in value.vacations) && (!that.filter.group || that.filter.group == value.group) && (!that.filter.uid || that.filter.uid == value.uid) ) {
          let { list } = value.vacations;
          var {firstName, lastName} = value;
          angular.forEach(list, function (value) {
            var {startDate, endDate, status} = value;
            
              if (value.status == that.statusFilter.status || that.statusFilter.status == "") {
                let typeEvent = {rejected:'important',confirmed:'info', inprogress:'warning'};
                var event = 
                {
                  title: firstName + ' '+ lastName,
                  type: typeEvent[status],
                  startsAt: new Date(startDate),
                  endsAt: new Date(endDate),
                  editable: false,
                  deletable: false,
                  incrementsBadgeTotal: true,
                  recursOn: 'year',
                  user: user
                };
                events.push(event);
              }
            
          });
        }
      });
    }


  calcDays(startDate, endDate) {
    return moment().isoWeekdayCalc(startDate, endDate, [1, 2, 3, 4, 5])
  }

  setOrder(val) {
    this.order = val;
  }

  isActive(val) {
    return val === this.order;
  }

} 
